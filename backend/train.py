
# This file is suppose to be ran before the launch of the server. Although, the server will check if you have trained the model or not, and if you haven't it will do it itself, giving the user a loading indicator that the server is unusable for the meantime

from pathlib import Path
import pandas as panda
from typing import NamedTuple
import joblib
from sklearn.model_selection import train_test_split
from sklearn.tree import DecisionTreeClassifier
from sklearn.metrics import accuracy_score, precision_score, recall_score, f1_score
import sys

class Result(NamedTuple):
    success: bool
    message: str | None

BASE_DIR = Path(__file__).resolve().parent
CSV_FILE_PATH = BASE_DIR / "Data" / "Featured_Dataset.csv" # you can change this constant to use a different file if needed


MODEL_DIR = BASE_DIR / "Models"
MODEL_PATH = MODEL_DIR / "Phishing_Model.joblib"


# The columns that get added to the csv. Keep these in the same order as the values in get_url_features
FEATURE_COLUMNS = [ # All commented out sections are removed because of EDA
    # "url_length",
    "num_dots",
    "num_hyphens",
    "host_hyphens",
    # "num_digits",
    # "num_special_chars",
    "has_https",
    "has_ip",
    # "num_subdomains",
    "domain_length",
    "has_at_symbol",
    # "path_length",
    # "url_entropy"
]




def main() -> Result:
    """The step by step process of ensuring that a csv is correct, and training the model and saving it.

    Returns:
        Result: Returns the Result class containing a success bool and message str. If the success bool is false, it indicates that the process failed somewhere and the message will be supplied otherwise the message will be None
    """
    
    if not CSV_FILE_PATH.is_file() or CSV_FILE_PATH.suffix.lower() != ".csv":
        return Result(False, "The file isn't a valid .csv file")
        
    
    dataset = panda.read_csv(CSV_FILE_PATH)
    
    
    
    # Checks if the csv file has all the required features:
    missing_columns = match_features(dataset)
    
    if missing_columns:
        return Result(False, f"csv file does not contain all required features [{missing_columns}]")
    
    
    fix_nan_in_has_https(dataset)
    feature_table = dataset[FEATURE_COLUMNS]
    labels = swap_type_to_int(dataset)
    
    if len(feature_table) != len(labels):
        return Result(False, "For some reason the features and the data dont match in length")
    
    
    features_train, features_test, labels_train, labels_test = create_test_and_train_data(feature_table, labels)
    model = train_model(features_train, labels_train)
    
    scores = gauge_model_accuracy(model, features_test, labels_test)
    
    
    print("======================================")
    print(f"Accuracy = {scores['accuracy']}")
    print(f"Precision = {scores['precision']}")
    print(f"Recall = {scores['recall']}")
    print(f"F1 = {scores['f1']}")
    print("======================================")
    
    if MODEL_PATH.is_file():
        print(" == There is an already existing trained model. This will be replaced == ")
    return save_model(model, scores)
    
    
    
    


def match_features(dataset) -> list:
    """Checks if the csv provided has all the required fields

    Args:
        dataset (DataFrame): The dataframe provided from pandas.read_csv()

    Returns:
        list: Returns a list of all features that are not inside the csv file that are required to be there. If all are present then it will return an empty list
    """
    
    print("checking feature matches")

    missing_columns = []
    for column in FEATURE_COLUMNS + ["type"]:
        if column not in dataset.columns:
            missing_columns.append(column)
            
    return missing_columns


def swap_type_to_int(dataset) -> list:
    print("Replacing all Benign and others to 0 and 1")
    labels = []
    for label in dataset["type"]:
        if label == "benign":
            labels.append(0)
        else:
            labels.append(1)
            
    return labels


def fix_nan_in_has_https(dataset):
    """Will replace all NaN data in the `has_https` field with Zero. This is because we are to assume that any url that does not begin with http(s):// is http://

    Args:
        dataset (DataFrame): dataset (DataFrame): The dataframe provided from pandas.read_csv()
    """
    
    print("Replacing all NaN in `has_https` field with 0")
    nan_sum = dataset["has_https"].isna().sum()
    
    if nan_sum > 0:
        dataset["has_https"] = dataset["has_https"].fillna(0) # we replace all nan with zero because we are going to assume that its http.
    else:
        print("No fields had NaN for `has_https` field")
        return
    
    print(f"filled {nan_sum} NaN has_https fields")
    
    
    

def create_test_and_train_data(feature_table, labels):
    """Will split up the data into 4 separate variables. 2 are to train the Ai on and will contain 80% of the data. The other 2 will be used to test the AI (to gauge accuracy) and contains 20% of the data

    Args:
        feature_table (DataFrame): The DataFrame that pandas.read_csv() returns but only the features of the data (excluding url and type as the model doesn't need them to train)
        labels (list): A list of all benign and malicious set to integers of either 0 or 1

    Returns:
        list: Each of the train and test versions for the model to work on
    """
    print("Splitting test and train data for the model")
    features_train, features_test, labels_train, labels_test = train_test_split(
        feature_table,
        labels,
        test_size=0.2,
        random_state=1,
        stratify=labels
    )
    print("Separated test and train data")
    
    return features_train, features_test, labels_train, labels_test
    
    
def train_model(features_train, labels_train):
    """Trains the model on the data provided

    Args:
        features_train (list): A list of all the features for every row of data
        labels_train (list): A list of all the labels for every row of data (0 or 1 for benign or malicious)

    Returns:
        DecisionTreeClassifier: Returns the trained DecisionTreeClassifier class (ie the model)
    """
    print("Training model on train data")
    model = DecisionTreeClassifier(max_depth=10, random_state=1)
    model.fit(features_train, labels_train)
    
    
    return model
    

def gauge_model_accuracy(model, features_test, labels_test) -> dict:
    """Runs test on a trained model to gauge the accuracy of the model

    Args:
        model (DecisionTreeClassifier): The trained model
        features_test (list): A list of all features for every row that will be used to test the AI (data it hasn't seen yet)
        labels_test (list): A list of all labels for every row that will be used to check the answer of the model (correlated to the data provided for features_test)

    Returns:
        dict: A dictionary containing "accuracy", "precision", "recall", and "f1"
    """
    print("Making model predict on test data")
    predictions = model.predict(features_test)
    accuracy = accuracy_score(labels_test, predictions)
    precision = precision_score(labels_test, predictions)
    recall = recall_score(labels_test, predictions)
    f1 = f1_score(labels_test, predictions)
    
    return {"accuracy": accuracy, "precision": precision, "recall":recall, "f1": f1}
      
    
    
def save_model(model, scores) -> Result:
    """Save the model in a non destructive way (Only if the process fails midway)
    If a already trained model is saved, it will create a new file replacing the old one with a newly trained model. If for some reason it fails to do so, the model to be replaced will not be touched

    Args:
        model (DecisionTreClassifier): the fully trained model to save
        scores (dict): The dict containing the models scores

    Returns:
        Result: Returns the Result class containing a success bool and message str. If the success bool is false, it indicates that the process failed somewhere and the message will be supplied otherwise the message will be None
    """
    print("Saving model")
    
    
    MODEL_DIR.mkdir(exist_ok=True)
    
    bundle = {
        "model": model,
        "feature_columns": FEATURE_COLUMNS,
        "scores": scores
    }
    
    
    
    try:
        temp_path = MODEL_PATH.with_suffix(".tmp") # we use tmp file so that if there was a model before, and this one fails to make it doesn't get removed
        joblib.dump(bundle, temp_path)
        temp_path.replace(MODEL_PATH)
    except OSError as error:
        return Result(False, f"Failed to save model: {error}")

    return Result(True, None)
    
    
if __name__ == "__main__":
    print("Running Model Training...")
    try:
        result = main()
    except KeyboardInterrupt:
        print(" ===== Operation Canceled =====")
        sys.exit(1)
    except Exception as error:
        print(f"Something went wrong: {error}")
        sys.exit(1)
        
    
    if not result.success:
        print(result.message)
        sys.exit(1)
    else:
        print("Completed operation")
