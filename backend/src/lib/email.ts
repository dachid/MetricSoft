import nodemailer from 'nodemailer'

// Email transporter configuration
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
})

export interface SendEmailOptions {
  to: string
  subject: string
  html: string
  text?: string
}

export async function sendEmail(options: SendEmailOptions): Promise<void> {
  try {
    await transporter.sendMail({
      from: {
        name: process.env.FROM_NAME || 'MetricSoft',
        address: process.env.FROM_EMAIL || process.env.SMTP_USER || '',
      },
      to: options.to,
      subject: options.subject,
      html: options.html,
      text: options.text,
    })
    
    console.log(`Email sent successfully to ${options.to}`)
  } catch (error) {
    console.error('Failed to send email:', error)
    throw new Error('Failed to send email')
  }
}

export function generateLoginCode(): string {
  // Generate 6-digit code
  return Math.floor(100000 + Math.random() * 900000).toString()
}

export function getLoginEmailTemplate(code: string, userEmail: string): { html: string; text: string } {
  const html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Your MetricSoft Login Code</title>
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', sans-serif;
          line-height: 1.6;
          color: #333;
          max-width: 600px;
          margin: 0 auto;
          padding: 20px;
          background-color: #f7fafc;
        }
        .container {
          background: white;
          padding: 40px;
          border-radius: 12px;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.07);
        }
        .header {
          text-align: center;
          margin-bottom: 30px;
        }
        .logo {
          display: inline-block;
          width: 50px;
          height: 50px;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          border-radius: 12px;
          margin-bottom: 20px;
          position: relative;
        }
        .logo::after {
          content: "📊";
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          font-size: 24px;
        }
        .title {
          color: #2d3748;
          font-size: 28px;
          font-weight: 700;
          margin: 0;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }
        .code-container {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          padding: 30px;
          border-radius: 12px;
          text-align: center;
          margin: 30px 0;
        }
        .code {
          font-size: 36px;
          font-weight: 700;
          color: white;
          letter-spacing: 8px;
          margin: 0;
          font-family: 'Monaco', 'Menlo', monospace;
        }
        .code-label {
          color: rgba(255, 255, 255, 0.9);
          font-size: 14px;
          margin-top: 10px;
        }
        .message {
          color: #4a5568;
          font-size: 16px;
          line-height: 1.6;
          margin-bottom: 25px;
        }
        .warning {
          background: #fed7d7;
          border: 1px solid #feb2b2;
          border-radius: 8px;
          padding: 15px;
          color: #742a2a;
          font-size: 14px;
        }
        .footer {
          text-align: center;
          margin-top: 40px;
          padding-top: 30px;
          border-top: 1px solid #e2e8f0;
          color: #718096;
          font-size: 14px;
        }
        .metrics-stats {
          display: flex;
          justify-content: space-around;
          margin: 20px 0;
          text-align: center;
        }
        .stat {
          flex: 1;
        }
        .stat-number {
          font-size: 24px;
          font-weight: 700;
          color: #667eea;
        }
        .stat-label {
          font-size: 12px;
          color: #718096;
          text-transform: uppercase;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <div class="logo"></div>
          <h1 class="title">MetricSoft</h1>
        </div>
        
        <div class="message">
          <strong>Hello!</strong><br>
          You requested access to your MetricSoft performance management dashboard. Use the secure code below to sign in:
        </div>
        
        <div class="code-container">
          <div class="code">${code}</div>
          <div class="code-label">Your 6-digit login code</div>
        </div>
        
        <div class="message">
          This code will expire in <strong>10 minutes</strong> for security reasons. If you didn't request this login, you can safely ignore this email.
        </div>
        
        <div class="metrics-stats">
          <div class="stat">
            <div class="stat-number">360°</div>
            <div class="stat-label">Performance View</div>
          </div>
          <div class="stat">
            <div class="stat-number">94%</div>
            <div class="stat-label">Goal Achievement</div>
          </div>
          <div class="stat">
            <div class="stat-number">2.3x</div>
            <div class="stat-label">Faster Decisions</div>
          </div>
        </div>
        
        <div class="warning">
          <strong>Security Notice:</strong> Never share this code with anyone. MetricSoft will never ask for your login code via phone, email, or any other method.
        </div>
        
        <div class="footer">
          <p>This login code was sent to ${userEmail}</p>
          <p>© 2025 MetricSoft. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `

  const text = `
    MetricSoft - Your Login Code
    
    Hello!
    
    You requested access to your MetricSoft performance management dashboard.
    
    Your 6-digit login code: ${code}
    
    This code will expire in 10 minutes for security reasons.
    
    If you didn't request this login, you can safely ignore this email.
    
    Security Notice: Never share this code with anyone. MetricSoft will never ask for your login code via phone, email, or any other method.
    
    This login code was sent to ${userEmail}
    
    © 2025 MetricSoft. All rights reserved.
  `

  return { html, text }
}
