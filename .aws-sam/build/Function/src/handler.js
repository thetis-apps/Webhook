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

var AWS = require('aws-sdk');
AWS.config.update({region:'eu-west-1'});


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

async function getSetup(context) {
    let dataDocument = JSON.parse(context.dataDocument);
    if (dataDocument == null) {
        return null;
    } 
    return dataDocument.Webhook;
}

exports.eventHandler = async (sqsEvent, context) => {
    
    console.log(JSON.stringify(sqsEvent));
    
    for (let i = 0; i < sqsEvent.Records.length; i++) {
        
        let event = JSON.parse(sqsEvent.Records[i].body);
    
        let detail = event.detail;
        
        let contextId = process.env.ContextId;
        
        let ims = await getIMS();
        
        let response = await ims.get('contexts/' + contextId);
        let context = response.data;
        
        let setup = await getSetup(context);
        
        console.log(JSON.stringify(setup));
        
        if (setup != null && setup.url != null) {
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
                console.log("Calling webhook at: " + setup.url);
                let response = await axios.post(setup.url, event);   
                console.log("SUCCESS " + JSON.stringify(response.data));
            }
        }
        
    }    
};

