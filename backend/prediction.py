import math

from sklearn.tree import DecisionTreeClassifier
import joblib
from schemas import PredictResponse
from pathlib import Path
from typing import Any
from train import MODEL_PATH

from features import FEATURE_COLUMNS




# Each pair is (text if the URL went LEFT, text if it went RIGHT). This is based on how the decision tree makes its decisions
# Left means value <= threshold. For a 0/1 feature, left means 0 and right means 1.
SENTENCES = {
    "num_dots": ("The URL has {limit} or fewer dots.", "The URL has more than {limit} dots."),
    "num_hyphens": ("The URL has {limit} or fewer hyphens.", "The URL has more than {limit} hyphens."),
    "host_hyphens": ("The domain has {limit} or fewer hyphens.", "The domain has more than {limit} hyphens."),
    "has_https": ("The link doesn't use HTTPS.", "The link uses HTTPS."),
    "has_ip": ("The link uses a domain name, not a raw IP address.", "The link uses a raw IP address."),
    "domain_length": ("The domain is {limit} characters or shorter.", "The domain is longer than {limit} characters."),
    "has_at_symbol": ("The link has no '@' symbol.", "The link contains an '@' symbol."),
} # Each one of these sentenses correlate to a feature. So when we have the models decisions we can map a user friendly reason to it






# This file is complicated as we have to essentially figure out what the model was thinking and make a human readable reasoning hence why this file in heavily commented
#(please note that when writing the comments I may not have been literal in some of them, as I use it to explain more than how it actually works)
#
# Originally I was going to make it so that once the model predicts an answer, we would have a bunch of if statements that would check predetermined values to essentially guess what the model was thinking
# But this just left me with an ugly giant if statement block. Ontop if didn't actually answer what the model was thinking, so reasoning could have been different between my guess and the models prediction
#
# Hence why i decided to take a more complicated approach. The core idea is that the model we used (DecisionTreeClassifier) is essentially a giant binary tree, where each node the model asks a question about the features we put in
# So all we need to do to figure out what the model was thinking is walk down the same path the model did and extract the values it used and the answers it gave to reform the question it was asking
# which from there we can determine which of the above sentences is appropriate to send the user.
#
# The over all structure looks like this
#                   make_prediction() | This is our entry point from main.py, It does the large portion of actually making the model predict what the answer is
#                           |
#                           |
#                           V
#            ------ build_reasons() | This will actually form the human readable sentences for the user 
#            |              |
#            |              | 1
#            | 2            V
#            |      explain_prediction() | This is probably the most important step, and is called almost immediately by build_reasons(). It will essentially walk down the path the model took, and pull out key facts about it
#            |              |                For example, what feature is this node talking about? What was the threshold to turn left or right? Compared to the last node, how far did the malcious share move after this question (towards phishing or legitimate?)
#            |              |
#      size_of_change()     |  | From the explain_reasons change, we figure out how big the change was without caring about direction. So essentially before it was we moved left by 60% -> the change was a 60% shift
#                           |    This is important for us to gauge what nodes (questions) had the most significance
#                           |
#                           V
#                   malicious_share() | Figures out what fraction of the training URLs that reached this node were malicious.







def make_prediction(features: dict[str, float], ordered_features: list) -> PredictResponse:
    """Feeds the model a URL with extracted features and makes it make a prediction if its safe or phishing

    Args:
        features (dict[str, float]): The dictionary of features and their values for the URL
        ordered_features (list): A ordered list of the features above

    Returns:
        PredictResponse: A response that is ready to be sent to the front-end
    """

    bundle = joblib.load(MODEL_PATH) # load the bundle (to be reworked)
    model: DecisionTreeClassifier = bundle["model"] #grab the model from the bundle (to be reworked)
    phishing_probability = float(model.predict_proba([ordered_features])[0][1]) # make a prediction based on the users input (extracted and proceessed already) (returns the probability)
    
    if phishing_probability >= 0.5:             #
        verdict = "phishing"                    #
        confidence = phishing_probability       #
    else:                                       # Decides if the model thinks its phishing or legitimate based on its probability of it being phishing
        verdict = "legitimate"                  #
        confidence = 1 - phishing_probability   #
    
    # Reason extraction
    reasons = build_reasons(model, ordered_features)
    
    return PredictResponse(
        verdict=verdict,
        confidence=confidence,
        phishing_probability=phishing_probability,
        reasons=reasons,
        features=features,
    )

def build_reasons(model: DecisionTreeClassifier, row: list[float]) -> list[str]:
    """Turns the 3 biggest steps of the trees path into plain english sentences

    Args:
        model (DecisionTreeClassifier): The model we are working with
        row (list[float]): the ordered_features that where extracted from the URL and used to make the prediction

    Returns:
        list[str]: The list of human readable reasons why the model made said decision
    """
    
    steps = explain_prediction(model, row) # gets every step the URL took. because its a tree of decisions
    steps.sort(key=size_of_change, reverse=True) # Sorts all the Raw steps that the model took from largest to smallest (the biggest push in any direction)
    top_steps = steps[:3] #cap to three steps. We cap it so that the user isn't flooded with decisions that weren't as important than these (as sorted above)

    reasons = []
    for step in top_steps: # Loop through the top 3 steps 
        left_text, right_text = SENTENCES[step["feature"]] # will look up the pair for this step and unpacks it

        if step["went_left"]: # went left means the value was at or below the threshold, so we use our "left" wording from our SENTENCES. Otherwise we use the right
            sentence = left_text
        else:
            sentence = right_text

        sentence = sentence.format(limit=math.floor(step["threshold"])) # The sentences that have {limit} are filled with the actual number, we round that number down. SENTENCES without the {limit} are unaffected.

        if step["change"] > 0: # Attaches whether the step lowered suspicion or raised suspicion to the sentence to help the user identify what the model was thinking
            sentence += " (raises suspicion)"
        else:
            sentence += " (lowers suspicion)"

        reasons.append(sentence)

    if not reasons: # Add each sentence to the list. If there ain't any, then we explain that we dont see any red flags
        reasons.append("No obvious red flags were found in the URL's structure.")

    return reasons



def malicious_share(tree, node_id: int) -> float:
    """Figures out what fraction of the training URLs that reached this node were malicious

    Args:
        tree (Any): The models tree we want to look into (model.tree_)
        node_id (int): The node we are looking at

    Returns:
        float: A fraction of the training URLs that reached this node that were malicious
    """
    counts = tree.value[node_id][0]   # [benign, malicious]. This is used to grab the weight (not actually weighted) of how many urls at his point where safe / unsafe. it is used to weight the step e.g first step (for an example we 65% benign and 35% (may not be the real value)). Then the question we go down
                                      #                      We check, if that path was majority taken by malicious or safe urls. For example it may respond with [10%, 90%] for has_ip because 90% of the URLs that went down this path where malicious (this is just an example)
    return counts[1] / (counts[0] + counts[1]) # Returns the code above in fraction form. because sklearn can either have (70, 30) or (0.7, 0.3), so the output will always be a fraction e.g 0.3





def explain_prediction(model: DecisionTreeClassifier, row: list[float]) -> list[dict]:
    """Walks along the path of the binary tree from the model with the given URL features in mind, then records each question the model asked
    note that change is how much the malicious share moved after that question (positive = towards phishing)

    Args:
        model (DecisionTreeClassifier): The model we used to predict
        row (list[float]): The ordered_features we used to make the prediction

    Returns:
        list[dict]: One dict per question asked: the feature name, threshold, whether it went left and the change in malicious share
    """
    
    tree: Any = model.tree_ # Grabs the trained trees data
    
    
    visited_nodes = model.decision_path([row]).indices # grabs the nodes that this row passed through

    steps = []
    for node_id in visited_nodes: # Visit each of the nodes in order
        left_child = tree.children_left[node_id]
        right_child = tree.children_right[node_id]

        if left_child == right_child:   # we look at if the node is a leaf. if it is we skip it
            continue

        feature_index = tree.feature[node_id] # gets which feature this node is talking about (has_ip, has_https, num_hyphens etc)
        threshold = tree.threshold[node_id] # Gets the threshold the the question on the node. For example if it was 12 on domain_length we would be able to know wha the question was. for example is the domain 12 characters ir shorter
        value = row[feature_index] # because feature_index is a number. it points towards what feature we are talking about. If it was 2, than host_hyphens. This is because the list relates directly with our FEATURE_COLUMNS (num_dots would be 0, has_at_symbol would be 6)


        # with the data we gathered about. we have managed to form the question that the node has answered. for example is has_ip at most 0.5? (basically asking is it 0 or 1)
        if value <= threshold: # this essential asks the same thing the model already asked. is this value smaller than or equal to the threshold? if so then go left, if not then go right. We also get the nice child
            went_left = True
            next_node = left_child
        else:
            went_left = False
            next_node = right_child

        steps.append({
            "feature": FEATURE_COLUMNS[feature_index], # We map the number back to a readable name for us ( 5 -> domain_length)
            "threshold": threshold, # both this and went_left are so we can pick the right sentence that correlates to its answer
            "went_left": went_left,
            "change": malicious_share(tree, next_node) - malicious_share(tree, node_id), # this is the share after the question minus the share before it (to figure out how big of a push towards benign or malicious the question give us)
        })

    return steps


def size_of_change(step: dict) -> float:
    """Uses the value from explain_prediction and calculates from the change value how big the change was ignoring the direction

    Args:
        step (dict): The value from explain_prediction (not the entire list, just single part of the list )

    Returns:
        float: The value of how big the change was
    """
    return abs(step["change"]) # this takes the step from above and returns a single number. How big the change was ignoring the direction