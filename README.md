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
So for the first part we have identified two types of people that may want to do malicious activities with our site
    - A phishing link owner/ hoster or someone directly correlated in scamming / phishing or any other similar practices
    - A cybervandalist who is just there to destroy

These people will want to achieve a somewhat similar goal. A phishing link owner may want to find a way to spoof our model to make their links appear as legitimate so that the public will fall for their schemes, they may just want to straight up bring down the site entirely, API flooding or any other means. A cybervandalist may also want to do these actions, for example they may want to make all legitimate links appear fake and phishing links appear legitimate (model swapping). But on the more destructive side, they may want to load their own models, or stop our site from working at all.


These kinds of people can thankfully only do so much damage to a simple site like ours. Since we have no login system and history is stored per session, they have no way of gaining "unauthorised access" to our website if the entirety is public. On-top we store absolutely no data, so they wont be able to use SQL injection or any other data manipulation techniques, they also cant make malicious code run on our website's frontend that runs on other user's computers (stored XSS). Although just because we are a simple website doesn't make us immune to threats. Things that they could attempt on us are
    - Model swapping. The hackers may want to replace their own model with our model without us knowing
    - Run code on our backend. The hackers may want to take over completely by opening back doors through code that they made
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
On top we ran a OWASP ZAP and found only 1 finding one issue, this being that we had no `X-Content-Type-Options` header set. This header not being present means our server doesn't send the nosniff directive and opens us up to MIME confusion and possible XSS vulnerabilities





## Detection Evasion: Attack, Defence, and Measurements (2.8)
This documents one of the attacks identified during DetectivePhisher's security review:
**detection evasion**, where an attacker rewrites a phishing URL so it still
reaches the same destination but "looks different" to the model, without
changing what a person sees when they read the link. The reason we choose this
option was that it fit our software design the best in comparison to the rest

### The attack
DetectivePhisher's model `backend/train.py` is a
`DecisionTreeClassifier` trained on seven purely structural features computed
in `backend/features.py`:

`num_dots, num_hyphens, host_hyphens, has_https, has_ip, domain_length, has_at_symbol`

Because every one of these is a simple character count/check over the raw URL
string, an attacker doesn't need to change the destination at all to change the
model's input — they just need to represent the *same* destination differently.
`backend/validation.py` already blocked spaces and
Unicode control characters, but didn't account for:

- **Homoglyphs** — look-alike Unicode punctuation/letters (e.g. the CJK
  "ideographic full stop" `。` instead of `.`, or a Cyrillic `а` instead of a
  Latin `a`) that read as identical to a person but aren't matched by
  `url.count(".")`/`url.count("-")`.
- **Punycode/IDN domains** — a homoglyph domain can be submitted either as raw
  Unicode or as its `xn--...` punycode form. Before the fix, those two
  representations of the *same* domain produced different `domain_length` and
  `host_hyphens` values (the `xn--` prefix alone adds two literal hyphens).
- **Percent-encoding** — `-` can be hidden behind `%2D`, since `urlparse`/the
  feature counts never decode the URL.
- **Case and dot differences** — a trailing dot or a different letter case
  refers to the exact same host.

### The fix
`normalize_url()` in (backend/security_utils.py) canonicalises a URL, so two
representations of the same destination always produce the same features. It
lives alongside the other request-hardening code in `security_utils.py`, and
is called from `validate_url()`in (backend/validation.py) — *before* the URL
ever reaches `features.py` — so every other caller of `extract_features()`
automatically benefits without needing to know normalization happened:

1. Percent-decodes the whole URL (re-checking for spaces/control characters
   that decoding could reveal, since the rest of `validate_url` only saw the
   encoded form).
2. Folds look-alike characters via Unicode NFKC plus a small curated
   `CONFUSABLES` table (covering common Cyrillic/Greek lookalikes and
   punctuation substitutes for `.`, `-`, `@`).
3. Decodes any `xn--` (punycode) labels in the host back to Unicode, then
   re-applies the folding step above, so a homoglyph hidden inside punycode is
   also caught.
4. Lowercases the host, strips a trailing dot, and collapses duplicate dots.
5. Rebuilds the URL, preserving any `user:pass@` portion so the existing
   `has_at_symbol` check still fires on legitimate "lookalike@evil.com" tricks.

`validate_url(url, normalize=True)` (the new default) runs this after its
existing checks, then re-checks the hostname/TLD against the *canonical* form
(normalizing can reveal a different-looking host than the one checked before
it). `normalize=False` is kept so the measurement script below can reproduce
the pre-fix behaviour without checking out an older commit.

### What we measured
The `measure_evasion()` function in (backend/security_utils.py) measures the
**evasion rate**: of real phishing URLs the model already recognises, what
fraction of look-alike variants get a *different* verdict than the original?

- Seeds: 200 real phishing URLs from
  `backend/data/corrected_phishing_dataset.csv`
  that the model already flags as phishing.
- For each seed, one variant per technique is generated (homoglyphs,
  percent-encoding, punycode/IDN, case+dots), then run through
  `validate_url(variant, normalize=...)` — the same entry point `/api/predict`
  uses — so the measurement reflects the real end-to-end behaviour, including
  the pre-existing hostname/TLD check.
- "Before" uses `normalize=False` (the old behaviour); "after" uses the new
  default. A variant can also be rejected outright by `validate_url` (e.g. no
  literal "." left for the TLD check to find); that's tracked separately from
  an actual verdict flip.

Run it yourself from `backend/`:

`python security_utils.py`

## Results
| Technique          | Seeds tested | Evasion rate before | Evasion rate after |
|--------------------|:------------:|:--------------------:|:-------------------:|
| Homoglyphs         | 200          | 2.0%                 | 0.0%                |
| Percent-encoding   | 200          | 0.5%                 | 0.0%                |
| Punycode/IDN       | 199          | 4.5%                 | 0.0%                |
| Case & dots        | 200          | 0.0%                 | 0.0%                |

The model's decision tree also leans on `domain_length` and `has_ip`, which
these tricks don't touch, so most seeds were already robust — but every
technique still flipped some real phishing URLs before the fix, and none after.
A handful of punycode variants are rejected outright by the pre-existing
hostname/TLD check regardless of the fix (an unrelated side effect, not
something `normalize_url` controls).

**Regression check:** the same before/after comparison was run against 299
real benign (legitimate) URLs from the dataset — `normalize_url` produced
*zero* verdict changes, so the fix doesn't introduce new false positives on
ordinary URLs.

### Limitations
- `CONFUSABLES` is a small, hand-picked subset of Unicode's full
  [confusables list](https://util.unicode.org/UnicodeJsps/confusables.jsp),
  covering the characters attackers use most often against this feature set,
  not every possible look-alike character.
- The model's coarse, structural feature set means some evasion attempts fail
  regardless of normalization (e.g. `case_and_dots` measured 0% both before and
  after here) simply because no feature in this model is sensitive to letter
  case. Normalization closes the gap for every technique that *did* work.





## Generative AI Statement
Throughout this project AI was only used to help understand, give us ideas, or help us debug our website.

I Evan Harrison (105929605) contributed to approx 99% of backend code. I used AI for the following (most -> least used)
    -  `prediction.py` I already knew how to make the model predict prior, although after asking AI "If there was a way to get the models actual thought process" (as stated in the file, I talk about what I was going to do previously) I decided to get help on developing this complicated process. The AI assisted me in designing (by giving me a structured process on what is required to happen) and hints (For example how something is returned). I understand everything I wrote and even described the process above the file to demonstrate this knowledge.
    -  `validation.py` AI was only used for giving me ideas on what I should block, and any bugs that may occur.
    -  Overall. AI was used for debugging, or checking if what we have meets requirements

1 Henry Bennett (105923571) contributed to approx 98% of front end code. I used AI for the following (most -> least used)
    - `App.jsx` I have a great understanding of HTML but i did need AI to help me understand how to load the SVG icons as jsx.
    - `ai-model-status-icon.svg` I am new to making icons as .svg so i used AI to learn how to make them.
    - `server-status-icon.svg` I am new to making icons as .svg so i used AI to learn how to make them.
    - `style.css` Also hae a great understanding on CSS but learnt how to set min, preferred max size settings for something using `clamp` like `--donut-chart-label-font-size: clamp(0.75rem, 15cqw, 1.5rem);` in line 239 where cqw stands for Container Query Width meaning in this case the preferred size of the font in this case should be 15% of the containers width but no small or big that 0.75rem/1.5rem.