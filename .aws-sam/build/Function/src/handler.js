/**
 * Copyright 2022 Thetis Apps Aps
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * 
 * You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * 
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * 
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
const axios = require('axios');

async function getIMS() {

    const authUrl = "https://auth.thetis-ims.com/oauth2/";
    const apiUrl = "https://api.thetis-ims.com/2/";

	let clientId = process.env.ClientId;
	let clientSecret = process.env.ClientSecret;  
	let apiKey = process.env.ApiKey;  

    let credentials = clientId + ":" + clientSecret;
	let base64data = Buffer.from(credentials, 'UTF-8').toString('base64');	
	
	let imsAuth = axios.create({
			baseURL: authUrl,
			headers: { Authorization: "Basic " + base64data, 'Content-Type': "application/x-www-form-urlencoded" },
			responseType: 'json'
		});

    let response = await imsAuth.post("token", 'grant_type=client_credentials');
    let token = response.data.token_type + " " + response.data.access_token;
    
    let ims = axios.create({
    		baseURL: apiUrl,
    		headers: { "Authorization": token, "x-api-key": apiKey, "Content-Type": "application/json" }
    	});
	
	ims.interceptors.response.use(function (response) {
			console.log("SUCCESS " + JSON.stringify(response.data));
 	    	return response;
		}, function (error) {
			if (error.response) {
				console.log("FAILURE " + error.response.status + " - " + JSON.stringify(error.response.data));
			}
	    	return Promise.reject(error);
		});
		
    return ims;
}

async function getWebhook(setup) {
    
    let webhook;
    
    if (setup.auth == 'oauth2') {
        
    	let auth = axios.create({
			    headers: { 'Content-Type': "application/x-www-form-urlencoded" },
    			responseType: 'json'
    		});
    
        let data = { grant_type: 'client_credentials', client_id: setup.clientId, client_secret: setup.clientSecret, scope: setup.scope };
        let response = await auth.post(setup.authUrl, data);
        
        console.log(JSON.stringify(response.data));
        
        let token = response.data.token_type + " " + response.data.access_token;
        
        webhook = axios.create({
        		headers: { "Authorization": token, "Content-Type": "application/json" }
        	});
        	
    } else {
        
        webhook = axios.create({
        		headers: { "Content-Type": "application/json" }
            });
            
    }
	
	webhook.interceptors.response.use(function (response) {
			console.log("SUCCESS " + JSON.stringify(response.data));
 	    	return response;
		}, function (error) {
			if (error.response) {
				console.log("FAILURE " + error.response.status + " - " + JSON.stringify(error.response.data));
			}
	    	return Promise.reject(error);
		});
		
    return webhook;
}

exports.eventHandler = async (sqsEvent, context) => {
    
    console.log(JSON.stringify(sqsEvent));
    
    for (let i = 0; i < sqsEvent.Records.length; i++) {
        
        let event = JSON.parse(sqsEvent.Records[i].body);
    
        let detail = event.detail;
        
        let contextId = process.env.ContextId;
        
        let ims = await getIMS();
        
        let response = await ims.get('contexts/' + contextId + '/dataDocument');
        let dataDocument = response.data;
        let setup = dataDocument.Webhook;

        console.log(JSON.stringify(setup));
        
        if (setup != null && setup.url != null) {
            
            // Check that this is a event of a type that webhook is enabled for
            
            let found = false;
            if (setup.eventTypes != null) {
                for (let eventType of setup.eventTypes) {
                    if (eventType == detail.eventType) {
                        found = true;   
                    }
                }
            } else {
                found = true;
            }
            
            if (found) {
                
                // Mask event object if a field list is given
                
                let body;
                if (setup.fields != null) {
                    body = new Object();
                    for (let fieldName of setup.fields) {
                        body[fieldName] = detail[fieldName];
                    }
                } else {
                    body = event;
                }
                
                // Now call the webhook
                
                let webhook = await getWebhook(setup);
                
                try {
                    
                    await webhook.post(setup.url, body, { validateStatus: function (status) {
        				    return status >= 200 && status < 300 || setup.ignoreStatusCodes != null && setup.ignoreStatusCodes.includes(status); 
        				}});   

                } catch (error) {
                    
                    let message = new Object();
            		message.time = Date.now();
            		message.source = "Webhook";
            		message.messageType = "ERROR";
            		message.messageText = "Failed to call webhook at " + setup.url;
            		message.deviceName = detail.deviceName;
            		message.userId = detail.userId;
            		message.documentation = JSON.stringify(error);
            		await ims.post("events/" + detail.eventId + "/messages", message);
            		
            		// Re-throw the error to keep the event in queue
            		
            		throw error;

                }
                
            }
        }
        
    }    
};

