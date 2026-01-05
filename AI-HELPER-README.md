# AI Job Assistant Setup

## Prerequisites
- Node.js installed on your system

## How to Start

### Step 1: Start the Proxy Server
Run the proxy server to enable AI functionality:

**Option A - Using the batch file:**
```
Double-click start-ai-proxy.bat
```

**Option B - Using command line:**
```bash
node local-proxy.js
```

You should see: `Local Proxy running at http://localhost:3001`

### Step 2: Open the Application
1. Open `student.html` in your browser
2. Login as a student
3. Click on "AI Helper" in the sidebar

## Features

The AI Job Assistant can help you with:

- **Job Recommendations**: "What jobs am I eligible for?"
- **Eligibility Check**: "Can I apply to [Company Name]?"
- **Job Details**: "Tell me more about the Software Engineer role at Google"
- **Comparisons**: "Compare the highest paying jobs"
- **Deadline Alerts**: "Which jobs have urgent deadlines?"
- **Custom Queries**: Ask anything about available opportunities

## How It Works

1. **Real-time Data**: Uses your actual CGPA, branch, and available jobs from Firebase
2. **Personalized**: Knows which jobs you've already applied to
3. **Context-Aware**: Provides relevant recommendations based on your profile
4. **Powered by Xiaomi Mimo**: Uses GPT-4 through the Mimo API

## Troubleshooting

**"AI service unavailable" error:**
- Make sure the proxy server is running (`node local-proxy.js`)
- Check that port 3001 is not blocked
- Verify API key is valid

**No response from AI:**
- Check browser console for errors
- Ensure local proxy is running
- Check internet connection

## API Details

- **API Provider**: Xiaomi Mimo
- **Model**: GPT-4
- **Endpoint**: https://api.xiaomimimo.com/v1/chat/completions
- **Proxy**: Local CORS proxy on port 3001
