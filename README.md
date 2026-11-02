# Upwind Email Security Analyzer

A Gmail Add-on that evaluates an opened email for potential phishing and social engineering threats using AI analysis and deterministic security rules.

The goal is to provide a clear, explainable risk assessment directly inside Gmail, helping users identify suspicious messages without leaving their inbox.

## Features

- On-demand email analysis through a Gmail Add-on
- AI-based risk scoring from 0 to 100
- Low, Medium, or High risk verdict
- Human-readable AI reasoning
- Independent rule-based security checks
- Detection of common phishing language and shortened URLs
- Structured results displayed in the Gmail sidebar
- API-key authentication between the add-on and backend

## Architecture

Gmail Add-on (Google Apps Script)
        |
        | HTTPS + X-API-Key
        v
Render Cloud Web Service
        |
        v
Python FastAPI Backend
        |
        | OpenAI API
        v
AI Risk Assessment
        |
        v
Gmail Results Card

The add-on reads the currently opened email and extracts its sender, subject, and plain-text body.

The add-on performs basic rule-based checks and sends the email data to the FastAPI backend.

The backend authenticates the request and uses an OpenAI model to assess phishing indicators.

The results are displayed in the Gmail sidebar.

## Risk Assessment

### AI Assessment

The backend uses the OpenAI Responses API with the `gpt-5.4-mini` model.

The model receives the sender, subject, and email body and returns:

- `score`: an estimated risk score from 0 to 100
- `verdict`: Low, Medium, or High
- `reasoning`: a brief explanation of suspicious indicators

The AI score represents a model-generated assessment, not a verified probability of maliciousness. Scores may vary between repeated analyses.

### Rule-Based Checks

The add-on also applies the following deterministic checks:

| Indicator | Points |
| --- | ---: |
| Password-related language | 20 |
| Urgent language | 15 |
| Account verification request | 20 |
| Shortened URL (bit.ly or tinyurl.com) | 20 |

The total rule score is capped at 100.

Rule-based checks are intentionally separate from the AI score and do not determine the AI verdict.

A rule score of zero means none of the implemented patterns matched. It does not guarantee the email is safe.

## Project Structure

```text
upwind-email-security-analyzer/
├── gmail-addon/
│   ├── Code.gs
│   └── appsscript.json
├── backend/
│   ├── main.py
│   └── requirements.txt
├── .gitignore
└── README.md
```

## Installation and Setup

### Prerequisites

- Python 3.10 or newer
- A Google account with Gmail
- Google Apps Script
- An OpenAI API key

### 1. Start the Backend

From the `backend` directory, install the dependencies:

```bash
pip install -r requirements.txt
```

Configure these environment variables:

```text
OPENAI_API_KEY=your_openai_api_key
BACKEND_API_KEY=your_private_backend_key
```

Keep these values private. They must never be committed to the repository.

The OpenAI key can be configured as an operating-system environment variable. The backend key can be stored in a local `.env` file.

Start the backend:

```bash
python -m uvicorn main:app --host 127.0.0.1 --port 8001
```

Check the local health endpoint:

```text
http://127.0.0.1:8001/health
```

Expected response:

```json
{"status": "ok"}
```


### 2. Cloud Deployment (Render)

The Python FastAPI backend is deployed on Render using a paid Starter Web Service.

Live backend URL:
https://upwind-email-security-analyzer.onrender.com

Health check:
https://upwind-email-security-analyzer.onrender.com/health

The service is configured with:

- Language: Python 3
- Branch: main
- Root Directory: backend
- Build Command: pip install -r requirements.txt
- Start Command: uvicorn main:app --host 0.0.0.0 --port $PORT

Required environment variables:

- OPENAI_API_KEY
- BACKEND_API_KEY

Both secrets are configured securely in Render and are not included in the repository.

The backend runs independently of the developer's local computer. No local Python server or Cloudflare Tunnel is required for the deployed version.

### 3. Configure the Gmail Add-on

1. Create a Google Apps Script project.
2. Copy `gmail-addon/Code.gs` into the project.
3. Replace the project manifest with `gmail-addon/appsscript.json`.
4. Open Project Settings and configure Script Properties:

```text
BACKEND_URL=https://upwind-email-security-analyzer.onrender.com
BACKEND_API_KEY=your_private_backend_key
```

The `BACKEND_API_KEY` must match the value configured in the backend.

5. Create a test deployment of the Google Workspace Add-on.
6. Install the test deployment and authorize the required permissions.
7. Open Gmail and select an email.

### 4. Analyze an Email

1. Open an email in Gmail.
2. Open the Email Security Analyzer sidebar.
3. Click **Analyze Email**.
4. Review the AI risk score, verdict, explanation, and rule-based indicators.

Analysis is initiated by the user rather than performed automatically across the inbox.

## Security Considerations

- The add-on requests access to the currently opened Gmail message.
- The backend checks a shared secret using the `X-API-Key` HTTP header.
- Sensitive credentials are stored outside the public source code.
- Input size limits are enforced through Pydantic models.
- Email contents are treated as untrusted data in the AI instructions.
- The OpenAI request uses `store=False`.
- Email content and AI output are not independently verified as trustworthy.
- User-facing errors do not expose backend exception details.

## Testing

The add-on was tested against ordinary emails and a synthetic phishing-style email.

Example synthetic test:

Subject: `Urgent: Verify your account`

Body: `Please enter your password immediately.`

The rule-based component identifies three indicators:

- Urgent language: 15 points
- Account verification: 20 points
- Password request: 20 points

Total rule score: **55/100**

The AI component separately evaluates the same email and provides a risk assessment with reasoning.

## Limitations and Trade-offs

This is a proof-of-concept rather than a production-ready security product.

- AI scores are not calibrated probabilities and may vary between runs.
- Legitimate emails may receive high-risk scores (false positives).
- Rule-based detection covers a limited set of indicators.
- URLs are checked for selected shortened-link patterns but are not independently inspected for malicious destinations.
- Sender identity, email authentication records, and attachments are not independently verified.
- Plain-text email content may omit context from HTML formatting or embedded content.
- The backend is hosted on Render. Availability depends on the hosting service, network connectivity, and external AI API.

## Future Improvements

- Add SPF, DKIM, and DMARC verification.
- Improve URL analysis and domain reputation checks.
- Evaluate the scoring system against a labeled email dataset.
- Improve score consistency and reduce false positives.
- Add automated tests and monitoring.
- Introduce stronger authentication and operational safeguards for broader deployment.

## Design Decisions

The solution combines AI and deterministic rules to balance flexible contextual analysis with transparent, explainable indicators.

The two scores remain separate to avoid implying that manually selected rule weights represent validated probabilities.

Google Apps Script was chosen for direct Gmail integration, while Python FastAPI provides a simple, independently maintainable backend.

The current architecture prioritizes a working end-to-end prototype, clear security boundaries, and an understandable user experience over production-scale functionality.
