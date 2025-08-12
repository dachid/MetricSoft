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

export function getWelcomeEmailTemplate(organizationName: string, adminName: string, subdomain: string): { html: string; text: string } {
  const loginUrl = `http://localhost:3000/login`
  
  const html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Welcome to MetricSoft - Organization Admin Access</title>
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
          width: 60px;
          height: 60px;
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
          font-size: 28px;
        }
        .title {
          color: #2d3748;
          font-size: 32px;
          font-weight: 700;
          margin: 0 0 10px 0;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }
        .subtitle {
          color: #718096;
          font-size: 18px;
          margin: 0;
        }
        .welcome-message {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          padding: 30px;
          border-radius: 12px;
          text-align: center;
          margin: 30px 0;
          color: white;
        }
        .org-name {
          font-size: 28px;
          font-weight: 700;
          margin: 0 0 10px 0;
        }
        .role-badge {
          background: rgba(255, 255, 255, 0.2);
          padding: 8px 16px;
          border-radius: 20px;
          font-size: 14px;
          font-weight: 500;
        }
        .message {
          color: #4a5568;
          font-size: 16px;
          line-height: 1.6;
          margin-bottom: 25px;
        }
        .info-box {
          background: #ebf8ff;
          border: 1px solid #bee3f8;
          border-radius: 8px;
          padding: 20px;
          margin: 20px 0;
        }
        .info-title {
          color: #2b6cb0;
          font-weight: 600;
          font-size: 16px;
          margin: 0 0 10px 0;
        }
        .info-list {
          color: #2d3748;
          margin: 0;
          padding-left: 20px;
        }
        .info-list li {
          margin-bottom: 8px;
        }
        .cta-button {
          display: inline-block;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          padding: 15px 30px;
          text-decoration: none;
          border-radius: 8px;
          font-weight: 600;
          font-size: 16px;
          text-align: center;
          margin: 20px 0;
        }
        .subdomain-info {
          background: #f7fafc;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          padding: 20px;
          text-align: center;
          margin: 20px 0;
        }
        .subdomain-label {
          color: #718096;
          font-size: 14px;
          margin-bottom: 5px;
        }
        .subdomain-url {
          color: #667eea;
          font-size: 18px;
          font-weight: 600;
          font-family: 'Monaco', 'Menlo', monospace;
        }
        .next-steps {
          background: #f0fff4;
          border: 1px solid #9ae6b4;
          border-radius: 8px;
          padding: 20px;
          margin: 20px 0;
        }
        .footer {
          text-align: center;
          margin-top: 40px;
          padding-top: 30px;
          border-top: 1px solid #e2e8f0;
          color: #718096;
          font-size: 14px;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <div class="logo"></div>
          <h1 class="title">MetricSoft</h1>
          <p class="subtitle">Performance Management Platform</p>
        </div>
        
        <div class="welcome-message">
          <div class="org-name">${organizationName}</div>
          <div class="role-badge">Organization Administrator</div>
        </div>
        
        <div class="message">
          <strong>Congratulations, ${adminName}!</strong><br><br>
          
          You have been designated as the Organization Administrator for <strong>${organizationName}</strong> on MetricSoft. Your organization's performance management platform is now ready for setup and configuration.
        </div>
        
        <div class="subdomain-info">
          <div class="subdomain-label">Your Organization URL</div>
          <div class="subdomain-url">${subdomain}.metricsoft.com</div>
        </div>
        
        <div class="info-box">
          <div class="info-title">🚀 As Organization Administrator, you can:</div>
          <ul class="info-list">
            <li><strong>Configure Organization Settings</strong> - Customize terminology, fiscal periods, and branding</li>
            <li><strong>Set Up Organizational Hierarchy</strong> - Define levels, departments, teams, and positions</li>
            <li><strong>Manage Users</strong> - Invite team members and assign roles</li>
            <li><strong>Create Performance Perspectives</strong> - Set up strategic focus areas</li>
            <li><strong>Establish KPIs</strong> - Define key performance indicators</li>
            <li><strong>Generate Reports</strong> - Access performance analytics and insights</li>
          </ul>
        </div>
        
        <div style="text-align: center;">
          <a href="${loginUrl}" class="cta-button">Get Started - Login to MetricSoft</a>
        </div>
        
        <div class="next-steps">
          <div class="info-title">📋 Recommended Next Steps:</div>
          <ol class="info-list">
            <li><strong>Login</strong> - Click the button above to access your dashboard</li>
            <li><strong>Organization Settings</strong> - Configure your terminology and branding</li>
            <li><strong>Hierarchy Setup</strong> - Define your organizational structure</li>
            <li><strong>User Management</strong> - Invite team members to join</li>
            <li><strong>Performance Setup</strong> - Create perspectives and KPIs</li>
          </ol>
        </div>
        
        <div class="message">
          <strong>Need Help?</strong><br>
          Our team is here to support your success. If you have any questions or need assistance with setup, please don't hesitate to reach out.
        </div>
        
        <div class="footer">
          <p><strong>Welcome to the MetricSoft family!</strong></p>
          <p>© 2025 MetricSoft. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `

  const text = `
    MetricSoft - Welcome to Your Organization
    
    Congratulations, ${adminName}!
    
    You have been designated as the Organization Administrator for ${organizationName} on MetricSoft. Your organization's performance management platform is now ready for setup and configuration.
    
    Your Organization URL: ${subdomain}.metricsoft.com
    
    As Organization Administrator, you can:
    • Configure Organization Settings - Customize terminology, fiscal periods, and branding
    • Set Up Organizational Hierarchy - Define levels, departments, teams, and positions  
    • Manage Users - Invite team members and assign roles
    • Create Performance Perspectives - Set up strategic focus areas
    • Establish KPIs - Define key performance indicators
    • Generate Reports - Access performance analytics and insights
    
    GET STARTED: Login to MetricSoft
    Visit: ${loginUrl}
    
    Recommended Next Steps:
    1. Login - Access your dashboard using the link above
    2. Organization Settings - Configure your terminology and branding
    3. Hierarchy Setup - Define your organizational structure
    4. User Management - Invite team members to join
    5. Performance Setup - Create perspectives and KPIs
    
    Need Help?
    Our team is here to support your success. If you have any questions or need assistance with setup, please don't hesitate to reach out.
    
    Welcome to the MetricSoft family!
    
    © 2025 MetricSoft. All rights reserved.
  `

  return { html, text }
}
