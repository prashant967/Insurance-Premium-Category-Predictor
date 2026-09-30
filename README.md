# Insurance Premium Category Predictor

A Machine Learning-based API that predicts an individual's **Insurance Premium Category** (**Low**, **Medium**, or **High**) based on health, lifestyle, and demographic information. The project integrates a **Scikit-learn** model with a **FastAPI** backend to deliver real-time predictions with confidence scores and probability distributions.

---

## Features

- Predicts insurance premium category:
  - Low
  - Medium
  - High
- Displays confidence score for predictions
- Shows probability distribution for all premium categories
- REST API built with FastAPI
- Modular project structure for easy maintenance
- Ready for Dockerization and cloud deployment

---

## Tech Stack

| Category | Technologies |
|----------|--------------|
| Language | Python |
| Machine Learning | Scikit-learn, Pandas, NumPy |
| Backend | FastAPI |
| Model Serialization | Pickle |
| API Testing | Swagger UI, Postman |
| Version Control | Git & GitHub |

---

## Project Structure

```text
Insurance-Premium-Prediction/
│
├── model/
│   ├── model.pkl
│   └── predict.py
│
├── schema/
│   └── user_input.py
│
├── main.py
├── requirements.txt
├── .gitignore
└── README.md
```

---

## Input Features

The model uses the following features for prediction:

- BMI
- Age Group
- Lifestyle Risk
- City Tier
- Annual Income (LPA)
- Occupation

---

## Output

The application returns:

- Predicted Insurance Premium Category
- Confidence Score
- Probability Distribution for all classes

Example:

```json
{
    "prediction": "Medium",
    "confidence_score": 84.25,
    "probabilities": {
        "Low": 8.35,
        "Medium": 84.25,
        "High": 7.40
    }
}
```

---

## ⚙️ Installation

### 1. Clone the Repository

```bash
git clone https://github.com/your-username/Insurance-Premium-Prediction.git
cd Insurance-Premium-Prediction
```

### 2. Create a Virtual Environment
```bash
python -m venv myenv
```

### 3. Activate the Virtual Environment
#### Windows
```bash
myenv\Scripts\activate
```
#### Linux / macOS

```bash
source myenv/bin/activate
```
### 4. Install Dependencies
```bash
pip install -r requirements.txt
```

---

## Running the Application

### Start the FastAPI Server

```bash
uvicorn main:app --reload
```

FastAPI Documentation:

```
http://127.0.0.1:8000/docs
```

---

## API Endpoint

### POST `/predict`

Predicts the insurance premium category.

#### Request

```json
{
    "bmi": 22.8,
    "age_group": "Adult",
    "lifestyle_risk": "Medium",
    "city_tier": "Tier 1",
    "income_lpa": 12,
    "occupation": "private_job"
}
```

#### Response

```json
{
    "prediction": "Low",
    "confidence_score": 91.75,
    "probabilities": {
        "Low": 91.75,
        "Medium": 6.30,
        "High": 1.95
    }
}
```

---

## 📈 Future Improvements

- Docker support
- Cloud deployment (AWS, Azure, Render)
- CI/CD using GitHub Actions
- Model monitoring
- User authentication
- Prediction history database
- Improved feature engineering

---

## 👨‍💻 Author

**Prashant Singh**

- GitHub: https://github.com/prashant967


---

## ⭐ If you found this project helpful, consider giving it a star on GitHub!
