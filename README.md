# Wappler RabbitMQ Queues

## Overview
Wappler RabbitMQ Queues enables the creation and management of message queues to offload and control the execution of tasks using [RabbitMQ](https://www.rabbitmq.com/) and the `amqplib` library.

---

## Requirements
- A working RabbitMQ server connection.
- RabbitMQ server accessible from your Wappler application.

---

## Connection Configuration
RabbitMQ connection settings are configured directly in each action:

| Setting                   | Description                                                                                 |
|---------------------------|---------------------------------------------------------------------------------------------|
| `hostname`                | The RabbitMQ server hostname/IP (default: 'rabbit')                                        |
| `username`                | The RabbitMQ username (optional)                                                           |
| `password`                | The RabbitMQ password (optional)                                                           |

---

## Actions

### Add Job
- Adds a message job to a RabbitMQ queue.
- Executes by sending job data as a JSON message to the specified queue.
- Supports job delay, retry attempts with exponential backoff.
- Queue is created automatically if it doesn't exist.

**Job Parameters:**
- **Queue name**: Name of the RabbitMQ queue to send the job to.
- **Job data**: Key-value pairs of parameters to send with the job.
- **Minimum delay**: Delay in milliseconds before the job can be processed (default: 0).
- **Max retries**: Maximum number of retry attempts if sending fails (default: 0).
- **Initial delay**: Initial delay before the first retry in milliseconds (default: 1000).

---

### Get Jobs
- Retrieves messages from a specified RabbitMQ queue.
- Returns the current messages in the queue without consuming them.
- Shows the number of messages available in the queue.

**Parameters:**
- **Queue name**: Name of the RabbitMQ queue to check.

---

### RabbitMQ Health Check
- Checks the health and connectivity of RabbitMQ server.
- Validates queue existence and returns message counts.
- Useful for monitoring and ensuring RabbitMQ availability.

**Parameters:**
- **Timeout**: Connection timeout in milliseconds (default: 5000).
- **Queues to Check**: Comma-separated list of queue names to validate.

**Returns:**
- **status**: Boolean indicating if RabbitMQ is healthy and all queues exist.
- **message_count**: Total number of messages across all checked queues.

---

## Installation

1. Install the extension in your Wappler project.
2. Ensure you have a RabbitMQ server running and accessible.
3. The required `amqplib` dependency will be automatically installed.

---

## Usage Examples

### Basic Job Addition
Use the "Add Job" action to send a message to a RabbitMQ queue:
- Set **Queue name** to your desired queue (e.g., "email_processing")
- Add **Job data** with key-value pairs of parameters
- Optionally set a **Minimum delay** for delayed processing

### Health Monitoring
Use the "RabbitMQ Health Check" action to monitor your RabbitMQ server:
- Specify **Queues to Check** as comma-separated values
- Set appropriate **Timeout** for connection attempts
- Monitor the returned status and message counts

### Retrieving Messages
Use the "Get Jobs" action to inspect messages in a queue:
- Specify the **Queue name** to inspect
- Returns current messages without consuming them

---

## Error Handling

- **Connection Errors**: Authentication failures return HTTP 403 status
- **Timeout Handling**: Configurable timeout for connection attempts
- **Retry Logic**: Built-in exponential backoff for failed message sends
- **Queue Validation**: Automatic queue creation if queue doesn't exist

---

## Dependencies

This extension requires:
- **amqplib**: ^0.10.3 (automatically installed)
- **RabbitMQ Server**: Running and accessible from your application

---


