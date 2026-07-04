import pickle
import pandas as pd

# Load ML model
with open("model/model.pkl", "rb") as f:
    model = pickle.load(f)
# print(model.classes_)
# ML Model version
Modelversion = "1.0.0"


def predict_output(user_input: dict):
    input_df = pd.DataFrame([user_input])

    # Predicted class
    prediction = model.predict(input_df)[0]

    # Probability for each class
    probabilities = model.predict_proba(input_df)[0]

    # Confidence score (highest probability)
    confidence_score = round(max(probabilities) * 100, 2)
    
    probability_dict = {
        cls: round(prob * 100, 2)
        for cls, prob in zip(model.classes_, probabilities)
    }

    return {
        "prediction": prediction,
        "confidence_score": confidence_score,
        "probabilities": probability_dict,
    }