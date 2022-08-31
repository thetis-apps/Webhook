# Description

This application calls an endpoint of your choice whenever an event occur within Thetis IMS. You can read more about events in Thetis IMS [here](https://integration.thetis-ims.com/docs/EventBusDescription/).

# Installation

You may install the latest version of the application from within Thetis IMS. The name of the application is 'thetis-ims-webhook'.

# Configuration

In the data document of the context in which you install the application, you must create an object by the name 'Webhook'.

```
{
  "Webhook": {
    "url": "https://webhook.site/49cde022-7d31-467a-a290-ef70766d08bf",
    "eventTypes": [ "availableStockChanged", "physicalStockChanged" ]
  }
}
```

### url

This is the address of your webhook.

### eventTypes

The application will only call your webhook when an event of one of these types occur. This element is optional. If you leave it out, the application will call your webhook for all events.

# Error handling

The application queues all events as they occur. A function within the application reads events from the queue and calls your webhook. 
If your webhook returns any other status code than 200, the event is put back on queue. 
After 5 minutes the application will reread the failed event from the queue and try to call your webhook again. The application will do that for 12 hours, if your webhook keeps failing. 
After 12 hours the event is moved to a dead letter queue. Events in the dead letter queue may be processed at a later time. However, for that you must contact us. 
Note that if one event causes your webhook to fail, no other events will be handled by the function until the event has been moved to the dead letter queue.