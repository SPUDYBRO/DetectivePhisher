# Detective Phisher

Detective phisher is a web tool designed to assist users with identifying the legitimacy of a link by analyzing its features and making a prediction based on these features
This does not guarantee that our predictions are correct


Note that these instructions are windows only. If you are not using windows. in places explaining to use `winget`, then you will be required to download it from the website manually and install it that way


the model is included with the website, under `root/backend/Models/Phishing_Model.joblib`
If you wish to use your own model, you must place your CSV with feature extracted values matching the values in `features.py` inside `root/backend/Data/` name it `Featured_Dataset.csv`


## How to run Detective Phisher

### Requirements
    In order to use DetectivePhisher, you are required to have the following installed

    - Anaconda (conda)
    - npm
    - conda imported into an environment
    - A .csv file with data (This is optional as we have a pre-trained model ready, but if you want to make your own it's required)



### Installation of essentials

- Please see section "How to create conda environment 
- open your command prompt
- run `winget install OpenJS.NodeJS.LTS` inside the command prompt. This will install Node.js onto your computer (Node comes with npm)
- close and reopen your terminal to refresh it
- run `conda activate env` where env is the name of the environment you made in the conda steps. if you used the example than keep it as env
- run `npm install` in the root directory


### Running our code

With all our requirements fulfilled, you can now run our code with 3 separate methods
Use this command in the terminal inside the detectivephisher root
1. `npm run front` This will run only the frontend on localhost:5173
2. `npm run back` This will run only the backend on localhost:8000
3. `npm run full` This will run both frontend and backend concurrently

### How to create conda environment (windows only)
#### Ensuring conda is installed
Before you can run our code, you first need to have conda installed as it manages every dependency we use (for backend). To check if you have conda installed:
1. In the start menu (windows search menu), search up `Anaconda prompt`
2. If a software with this name appears, than you have conda installed

if you don't have it installed, than you are required to install it

#### Installing conda
There are many ways to install it but we will use `winget` for simplicity sake
1. open powershell and either use
   1. `winget install --id Anaconda.Miniconda3` to install the smaller, lightweight version (we used this) or
   2. `winget install --id Anaconda.Anaconda3` to install the full version
2. Wait for install to complete
3. run the new app `Anaconda prompt`
4. run the code `conda init powershell`
Congrats, you now have successfully installed conda



#### Importing conda environment  
to create the conda environment with our dependencies, run the code in powershell
1. `conda env create -n env -f .\environment.yml` Please ensure that `.\environment.yml` matches the actual file location of the download yml file
2. Accept all terms of service from conda if prompted
3. You will then be listed with all the dependencies of the project, type y to download the dependencies into the environment










## Threat model (2.6)
Firstly, people who host or own phishing or non-legitimate websites might be get frustrated as we help the general public with identifying these issues.
On-top, a lot of hacks are spontaneous and a lot of the time unprovoked, so people who are just generally interested in getting our website down or just wreaking as much havoc as possible
So for the first part I have identified two types of people that may want to do malicious activities with our site
    - A phishing link owner/ hoster or someone directly correlated in scamming / phishing or any other similar practices
    - A cybervandalist who is just there to destroy

These people will want to achieve a somewhat similar goal. A phishing link owner may want to find a way to spoof our model to make their links appear as legitimate so that the public will fall for their schemes, they may just want to straight up bring down the site entirely, API flooding or any other means. A cybervandalist may also want to do these actions, for example they may want to make all legitimate links appear fake and phishing links appear legitimate (model swapping). But on the more destructive side, they may want to load their own models, or stop our site from working at all.


These kinds of people can thankfully only do so much damage to a simple site like ours. Since we have no login system and history is stored per session, they have no way of gaining "unauthorised access" to our website if the entirety is public. On-top we store absolutely no data, so they wont be able to use SQL injection or any other data manipulation techniques, they also cant make malicious code run on our website's frontend that runs on other user's computers (stored XSS). Although just because we are a simple website doesn't make us immune to threats. Things that they could attempt on us are
    - Model swapping. The hackers may want to replace their own model with our model without us knowing
    - Run code on our backend. The hackers may want to take over completely by opening back doors through code that they made the server run
    - Flood our API with requests till it stops responding (too many requests to handle)
    - Flood our model with requests (extremely expensive requests to process)
    - Pasted text could be attacker controlled (they have intentionally added html in the link to escape and run on the users computer)





## Innovation. Security defenses (2.7)
The two security defenses we decided to implement was `denial of service` and `Misconfiguration and vulnerable dependencies`

### denial of service.
We deny requests that are too large and might slow the system down. We do this by looking at the packet as it comes it. if it is one packet, we look and identify if it is too large. we drop it if it is. For multiple packets we watch as they come in, but as soon as it gets too large we drop it. Both returning 413 error codes.
We also developed a way to block too many requests on our model. We do this my making a bounded semaphore (essentially a line that rejects anyone from joining if it is full) and allowing only them to work.
For flooding though, our model is extremely light and can handle lots of requests at once with ease, and if it gets too big we block it.

### Misconfiguration and vulnerable dependencies
Upon running npm audit we received two vulnerabilities notices. 1 moderate, and one high.
this is because we were using outdated Vite (6.4.3) which inturn caused other packages to be outdated. We fixed this by updating Vite to 8 and then doing a fresh install of npm (to remove old dependencies) which fixed both issues
Ontop we ran a OWASP ZAP and found only 1 finding one issue, this being that we had no `X-Content-Type-Options` header set. This header not being present means our server doesn't send the nosniff directive and opens us upto MIME confusion and possible XSS vulnerabilities




## Generative AI Statement

Throughout this project AI was only used to help understand, give us ideas, or help us debug our website.

I Evan Harrison (105929605) contributed to approx 99% of backend code. I used AI for the following (most -> least used)
    -  `prediction.py` I already knew how to make the model predict prior, although after asking AI "If there was a way to get the models actual thought process" (as stated in the file, I talk about what I was going to do previously) I decided to get help on developing this complicated process. The AI assisted me in designing (by giving me a structured process on what is required to happen) and hints (For example how something is returned). I understand everything I wrote and even described the process above the file to demonstrate this knowledge.
    -  `validation.py` AI was only used for giving me ideas on what I should block, and any bugs that may occur.
    -  Overall. AI was used for debugging, or checking if what we have meets requirements