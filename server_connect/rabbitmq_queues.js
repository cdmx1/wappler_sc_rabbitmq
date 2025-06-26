// Maintained by: Roney Dsilva 

const amqp = require('amqplib');
async function connect(context, hostname, username, password, timeout = 5000) {
    try {
        let connectionURL = `amqp://${hostname}`;
        
        if (username && password) {
            connectionURL = `amqp://${username}:${password}@${hostname}`;
        }
        
        let connectionPromise = amqp.connect(connectionURL);
        let timeoutPromise = new Promise((_, reject) => {
            setTimeout(() => {
                reject(new Error('Connection attempt timed out'));
            }, timeout);
        });

        let connection = await Promise.race([connectionPromise, timeoutPromise]);
        
        connection.on('error', (err) => {
            console.error('RabbitMQ Connection Error:', err.message);
        });
        return connection;
    } catch (error) {
        if (error.message.includes('ACCESS_REFUSED')) {
            const errorMessage = "Authentication failed. Please check your credentials.";
            context.res.status(403).json({ message: errorMessage });
        } else {
            console.error("Error connecting to the server:", error.message);
        }
        throw error;
    }
}

async function createChannel(context, connection) {
    try {
        const channel = await connection.createChannel();
        return channel;
    } catch (error) {
        console.log("Error creating channel:", error);
        throw error;
    }
}

async function checkRabbitMQHealth(connection, queues) {
    try {
        const channel = await connection.createChannel();

        const queueCounts = [];
        let allQueuesHealthy = true;
        let totalMessageCount = 0;
        for (const queue of queues) {
            try {
                const response = await channel.assertQueue(queue);
                const messageCount = response.messageCount;

                if (messageCount === undefined || messageCount === null || messageCount < 0) {
                    allQueuesHealthy = false;
                } else {
                    totalMessageCount += messageCount;
                }
            } catch (error) {
                if (error.code === 404 && error.message.includes('no queue')) {
                    allQueuesHealthy = false;
                } else {
                    throw error;
                }
            }
        }
        await channel.close();

        return {
            status: allQueuesHealthy,
            message_count: totalMessageCount
        };
    } catch (error) {
        console.error("Error checking RabbitMQ health:", error.message);
        return {
            status: false,
            message_count : 0
        };
    }
}


async function retryWithBackoff(context, fn, maxRetries, initialDelay) {
    for (let retryCount = 0; retryCount <= maxRetries; retryCount++) {
        try {
            await fn(context, retryCount);
            break; // Successful send, exit loop
        } catch (error) {
            console.log(`Error sending message to queue (retry ${retryCount}):`, error);
            if (retryCount < maxRetries) {
                await new Promise(resolve => setTimeout(resolve, initialDelay * Math.pow(2, retryCount)));
            } else {
                console.log(`Max retries reached. Error: ${error}`);
                throw error;
            }
        }
    }
}

exports.add_job = async function (options) {
        const delay_ms = parseInt(this.parseOptional(options.delay_ms, '*', 0));
        const hostname = this.parseRequired(options.hostname, 'string', 'Hostname is required');
        const username = this.parse(options.username) || null;
        const password = this.parse(options.password) || null;
        const jobData = this.parseRequired(options.job_data, 'object', 'Job Data is required') || {}
        const maxRetries = this.parse(options.max_retries) || 0;
        const initialDelay = this.parse(options.intial_delay) || 1000; // in milliseconds
        
        const connection = await connect(this, hostname, username, password);
        const channel = await createChannel(this, connection);
        let queueName = this.parseRequired(options.queue_name, 'string', 'Queue name is required');
    
        await retryWithBackoff(this, async (context, retryCount) => {
            await channel.assertQueue(queueName);
            await channel.sendToQueue(queueName, Buffer.from(JSON.stringify(jobData)), {
                properties: {
                    contentType: 'application/json',
                    headers: {
                        'x-delay': delay_ms,
                    },
                }
            });
        }, maxRetries, initialDelay);
    };
exports.get_jobs = async function (options) {
    const hostname = this.parseRequired(options.hostname, 'string', 'Hostname is required');
    const username = this.parse(options.username) || null;
    const password = this.parse(options.password) || null;
    const queueName = this.parseRequired(options.queue_name, 'string', 'Queue name is required');

    await connect(this, hostname, username, password);
    const channel = await createChannel(this, connection);

    const { messageCount } = await channel.checkQueue(queueName);

    const jobs = [];

    for (let i = 0; i < messageCount; i++) {
        const message = await channel.get(queueName);
        if (message !== false) {
            jobs.push(JSON.parse(message.content.toString()));
        }
    }

    return jobs;
}

exports.check_rabbitmq_health = async function (options) {
    const hostname = this.parseRequired(options.hostname, 'string', 'Hostname is required');
    const queues = this.parseRequired(options.queues, 'string', 'Queues to check are required').split(',');
    const username = this.parse(options.username) || null;
    const password = this.parse(options.password) || null;
    const timeout = this.parse(options.timeout);
    let connection;
    try {
        connection = await connect(this, hostname, username, password, timeout);
        console.log('Connected to RabbitMQ.');

        const healthInfo = await checkRabbitMQHealth(connection, queues);
        console.log('RabbitMQ Health Information:', healthInfo);
        return healthInfo;
    } catch (error) {
        console.error('Error occurred:', error.message);
        return {
            status: false,
            message_count : 0
        };
    } finally {
        if (connection) {
            try {
                await connection.close();
                console.log('Connection closed.');
            } catch (err) {
                console.error('Error closing connection:', err.message);
            }
        }
    }
};