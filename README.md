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
    
    "Webhook": {
    "url": "https://api.businesscentral.dynamics.com/v2.0/f9d3a6e1-be9d-4974-948c-127db36cd313/Production/api/pasnormal/thetis/v1.0/companies(3d729d18-026e-eb11-b854-000d3adb4521)/deliveryNoteEvents",
    "auth": "oauth2",
    "scope": " https://api.businesscentral.dynamics.com/.default",
    "fields": [
      "eventId",
      "documentId",
      "shipmentId"
    ],
    "authUrl": "https://login.microsoftonline.com/f9d3a6e1-be9d-4974-948c-127db36cd313/oauth2/v2.0/token",
    "clientId": "3620f52f-ae39-4f6e-b8f1-e9a333e0739a",
    "eventTypes": [
      "documentCreated"
    ],
    "clientSecret": "bNN8Q~2Kwx6e4cvO_zsbH~XfnRpNWN1QeXYiQaLX",
    "ignoreStatusCodes": [
      400
    ]
  }
  }
}
```

### url

This is the address of your webhook.

### auth

What type of authentication is required? Possible values are: 'oauth2' and 'none' (default).

### scope

Scope of the request when using oauth2 authentication.

### clientId

Client id to use for oauth2 authentication. This field is required when authentication type is 'oauth2'.

### clientSecret

Client secret to use for oauth2 authentication. This field is required when authentication type is 'oauth2'.

### fields

List of fields from the event object that are passed along to your webhook. This element is optional. If you leave it out, the application will pass all fields from the event object to your webhook. 

New fields are added to event objects without prior notice. Hence, if your webhook cannot silently ignore new fields, you should use this configuration option to define a fixed set of fields to pass to your webhook.

### eventTypes

The application will only call your webhook when an event of one of these types occur. This element is optional. If you leave it out, the application will call your webhook for all type of events.

### ignoreStatusCodes

The application will consider a call to your webhook successful, if the status code of your response is either less than 300 or contained in this list. This field is optional. 

# Error handling

The application queues all events as they occur. A function within the application reads events from the queue and calls your webhook. 
If your webhook returns any other status code than 200 or one of the status codes in the list of status codes to ignore, the event is put back on queue. 
After 5 minutes the application will reread the failed event from the queue and try to call your webhook again. The application will do that for 12 hours, if your webhook keeps failing. 
After 12 hours the event is moved to a dead letter queue. Events in the dead letter queue may be processed at a later time. However, for that you must contact us. 
Note that if one event causes your webhook to fail, no other events will be handled by the function until the event has been moved to the dead letter queue.