function buildHomePage() {
  return CardService.newCardBuilder()
    .setHeader(
      CardService.newCardHeader()
        .setTitle("Upwind Email Security Analyzer")
    )
    .addSection(
      CardService.newCardSection()
        .addWidget(
          CardService.newTextParagraph()
            .setText("Open an email to analyze its security.")
        )
        .addWidget(
          CardService.newTextButton()
            .setText("Analyze Email")
            .setOnClickAction(
              CardService.newAction()
                .setFunctionName("analyzeEmail")
            )
        )
    )
    .build();
}

function analyzeEmail(e) {
  try {
    const email = readEmail(e);
    const rulesResult = analyzeRules(email);
    const linksResult = checkLinks(email);
    const aiResult = analyzeWithAI(email);

    const ruleScore = Math.min(
      rulesResult.score + linksResult.score, 100
    );
    const reasons = [...rulesResult.reasons, ...linksResult.reasons];

    const score = Math.max(0, Math.min(100, Number(aiResult.score)));
    const verdict = String(aiResult.verdict);
    const reasoning = String(aiResult.reasoning);

    const section = CardService.newCardSection()
      .setHeader("Security Assessment");

    section.addWidget(
      CardService.newTextParagraph()
        .setText(
          "<b>AI Risk Score: " + score + "/100</b>" +
          "<br><b>Risk Level: " + verdict + "</b>"
        )
    );

    section.addWidget(
      CardService.newTextParagraph()
        .setText("<b>AI Analysis</b><br>" + escapeHtml(reasoning))
    );

    section.addWidget(
      CardService.newTextParagraph()
        .setText(
          "<b>Additional Security Checks</b><br>" +
          "Rule-Based Score: " + ruleScore + "/100<br>" +
          reasons.length + " suspicious patterns detected"
        )
    );

    if (reasons.length > 0) {
      section.addWidget(
        CardService.newTextParagraph()
          .setText(
            "<b>Detected Indicators</b><br>" +
            reasons.map(r => "&#8226; " + escapeHtml(r)).join("<br>")
          )
      );
    } else {
      section.addWidget(
        CardService.newTextParagraph()
          .setText("No predefined suspicious patterns detected.")
      );
    }

    section.addWidget(
      CardService.newTextParagraph()
        .setText(
          "<i>Scores are indicators, not confirmed phishing probabilities. " +
          "Rule-based checks are separate from the AI assessment.</i>"
        )
    );

    const card = CardService.newCardBuilder()
      .setHeader(
        CardService.newCardHeader()
          .setTitle("Email Security Analysis")
          .setSubtitle("Upwind Security Analyzer")
      )
      .addSection(section)
      .build();

    return CardService.newActionResponseBuilder()
      .setNavigation(
        CardService.newNavigation().pushCard(card)
      )
      .build();

  } catch (error) {
    console.error("Analysis failed:", error.message);

    return CardService.newActionResponseBuilder()
      .setNotification(
        CardService.newNotification()
          .setText("Analysis unavailable. Please check the connection and try again.")
      )
      .build();
  }
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, function(c) {
    return {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;"
    }[c];
  });
}

function readEmail(e) {
  GmailApp.setCurrentMessageAccessToken(e.gmail.accessToken);

  const message = GmailApp.getMessageById(e.gmail.messageId);

  return {
    sender: message.getFrom(),
    subject: message.getSubject(),
    body: message.getPlainBody()
  };
}
function analyzeRules(email) {
  let score = 0;
  let reasons = [];

  const text = (email.subject + " " + email.body).toLowerCase();

  const rules = [
    { pattern: /password|סיסמה/i, points: 20,
      reason: "Mentions a password" },

    { pattern: /urgent|immediately|דחוף|מיידי/i, points: 15,
      reason: "Uses urgent language" },

    { pattern: /verify your account|אימות חשבון/i, points: 20,
      reason: "Requests account verification" }
  ];

  for (const rule of rules) {
    if (rule.pattern.test(text)) {
      score += rule.points;
      reasons.push(rule.reason);
    }
  }

  return {
    score: Math.min(score, 100),
    reasons: reasons
  };
}
function testAnalyzeRules() {
  const email = {
    subject: "Urgent: Verify your account",
    body: "Please enter your password immediately."
  };

  const result = analyzeRules(email);
  console.log(result);
}

function checkLinks(email) {
  const text = email.body || "";
  const links = text.match(/https?:\/\/[^\s<>"]+/gi) || [];

  let score = 0;
  const reasons = [];

  for (const link of links) {
    if (/bit\.ly|tinyurl\.com/i.test(link)) {
      score += 20;
      reasons.push("Contains a shortened link");
    }
  }

  return {
    score: Math.min(score, 100),
    reasons: reasons
  };
}

function analyzeWithAI(email) {
  const properties = PropertiesService.getScriptProperties();
  const backendUrl = properties.getProperty("BACKEND_URL");
  const apiKey = properties.getProperty("BACKEND_API_KEY");

  if (!backendUrl || !apiKey) {
    throw new Error("Backend configuration is missing");
  }

  const response = UrlFetchApp.fetch(backendUrl + "/analyze", {
    method: "post",
    contentType: "application/json",
    headers: {
      "X-API-Key": apiKey
    },
    payload: JSON.stringify(email),
    muteHttpExceptions: true
  });

  if (response.getResponseCode() !== 200) {
    throw new Error("Backend analysis failed: " + response.getResponseCode());
  }

  return JSON.parse(response.getContentText());
}

function testConnectionPermission() {
  UrlFetchApp.fetch("https://www.google.com");
}
