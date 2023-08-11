// Maintained by: Roney Dsilva 

const amqp = require('amqplib');

var responseMessages = {};
responseMessages['norabbitmq'] = { "response": 'Queue NOT created -- No rabbitmq connection.' };
responseMessages['noqueue'] = { "response": 'Queue does not exist.' };

async function connect(hostname, username, password) {
    try {
        let connectionURL = `amqp://${hostname}`;
        
        if (username && password) {
            connectionURL = `amqp://${username}:${password}@${hostname}`;
            
        }
        connection = await amqp.connect(connectionURL);
        connection.on('error', (err) => {
            console.error('RabbitMQ Connection Error:', err.message);
        });
        return connection;
    } catch (error) {
        console.error("Error connecting to the server:", error.message);
        throw error;
    }
}
let connection;
async function createChannel(connection) {
    try {
        const channel = await connection.createChannel();
        return channel;
    } catch (error) {
        console.log("Error creating channel:", error);
        throw error;
    }
}
async function retryWithBackoff(fn, maxRetries, initialDelay) {
    for (let retryCount = 0; retryCount <= maxRetries; retryCount++) {
        try {
            await fn(retryCount);
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
    console.log(options)
        const delay_ms = parseInt(this.parseOptional(options.delay_ms, '*', 0));
        const hostname = this.parseRequired(options.hostname, 'string', 'Hostname is required');
        const username = this.parse(options.username) || null;
        const password = this.parse(options.password) || null;
        const jobData = this.parseRequired(options.job_data, 'object', 'Job Data is required') || {}
        const maxRetries = this.parse(options.max_retries) || 0;
        const initialDelay = this.parse(options.intial_delay) || 1000; // in milliseconds
        
        await connect(hostname, username, password);
        const channel = await createChannel(connection);
        let queueName = this.parseRequired(options.queue_name, 'string', 'Queue name is required');
    
        await retryWithBackoff(async (retryCount) => {
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