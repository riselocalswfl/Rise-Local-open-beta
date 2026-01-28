import { Resend } from 'resend';

let connectionSettings: any;

async function getCredentials() {
  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME;
  const xReplitToken = process.env.REPL_IDENTITY 
    ? 'repl ' + process.env.REPL_IDENTITY 
    : process.env.WEB_REPL_RENEWAL 
    ? 'depl ' + process.env.WEB_REPL_RENEWAL 
    : null;

  if (!xReplitToken) {
    throw new Error('X_REPLIT_TOKEN not found for repl/depl');
  }

  connectionSettings = await fetch(
    'https://' + hostname + '/api/v2/connection?include_secrets=true&connector_names=resend',
    {
      headers: {
        'Accept': 'application/json',
        'X_REPLIT_TOKEN': xReplitToken
      }
    }
  ).then(res => res.json()).then(data => data.items?.[0]);

  if (!connectionSettings || (!connectionSettings.settings.api_key)) {
    throw new Error('Resend not connected');
  }
  return {
    apiKey: connectionSettings.settings.api_key, 
    fromEmail: connectionSettings.settings.from_email
  };
}

async function getResendClient() {
  const { apiKey, fromEmail } = await getCredentials();
  return {
    client: new Resend(apiKey),
    fromEmail
  };
}

export interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export async function sendEmail(options: EmailOptions): Promise<{ success: boolean; error?: string }> {
  try {
    const { client, fromEmail } = await getResendClient();
    
    const result = await client.emails.send({
      from: fromEmail || 'Rise Local <noreply@riselocal.app>',
      to: options.to,
      subject: options.subject,
      html: options.html,
      text: options.text,
    });

    if (result.error) {
      console.error('[Email Service] Send error:', result.error);
      return { success: false, error: result.error.message };
    }

    console.log(`[Email Service] Email sent successfully to ${options.to}`);
    return { success: true };
  } catch (error) {
    console.error('[Email Service] Error:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to send email' 
    };
  }
}

export async function sendPasswordResetEmail(
  email: string, 
  resetToken: string, 
  firstName: string
): Promise<{ success: boolean; error?: string }> {
  const appUrl = process.env.REPLIT_DEV_DOMAIN 
    ? `https://${process.env.REPLIT_DEV_DOMAIN}`
    : process.env.REPLIT_DEPLOYMENT_URL 
    ? `https://${process.env.REPLIT_DEPLOYMENT_URL}`
    : 'https://riselocal.replit.app';
  
  const resetUrl = `${appUrl}/reset-password?token=${resetToken}`;
  
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="text-align: center; margin-bottom: 30px;">
        <h1 style="color: #2D5016; margin: 0;">Rise Local</h1>
        <p style="color: #666; margin-top: 5px;">Southwest Florida Deals</p>
      </div>
      
      <div style="background: #f9f9f9; border-radius: 8px; padding: 30px; margin-bottom: 20px;">
        <h2 style="margin-top: 0; color: #333;">Reset Your Password</h2>
        <p>Hi ${firstName || 'there'},</p>
        <p>We received a request to reset your password. Click the button below to create a new password:</p>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="${resetUrl}" style="background: #2D5016; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: 600;">Reset Password</a>
        </div>
        
        <p style="color: #666; font-size: 14px;">This link will expire in 1 hour for security reasons.</p>
        <p style="color: #666; font-size: 14px;">If you didn't request this password reset, you can safely ignore this email.</p>
      </div>
      
      <div style="text-align: center; color: #999; font-size: 12px;">
        <p>Rise Local - Supporting Southwest Florida Businesses</p>
        <p>If you're having trouble with the button, copy and paste this link:<br>
        <a href="${resetUrl}" style="color: #2D5016; word-break: break-all;">${resetUrl}</a></p>
      </div>
    </body>
    </html>
  `;

  const text = `
Reset Your Password

Hi ${firstName || 'there'},

We received a request to reset your password. Visit the link below to create a new password:

${resetUrl}

This link will expire in 1 hour for security reasons.

If you didn't request this password reset, you can safely ignore this email.

Rise Local - Supporting Southwest Florida Businesses
  `;

  return sendEmail({
    to: email,
    subject: 'Reset Your Rise Local Password',
    html,
    text
  });
}

export async function sendAccountRecoveryEmail(
  email: string, 
  resetToken: string, 
  firstName: string
): Promise<{ success: boolean; error?: string }> {
  const appUrl = process.env.REPLIT_DEV_DOMAIN 
    ? `https://${process.env.REPLIT_DEV_DOMAIN}`
    : process.env.REPLIT_DEPLOYMENT_URL 
    ? `https://${process.env.REPLIT_DEPLOYMENT_URL}`
    : 'https://riselocal.replit.app';
  
  const setPasswordUrl = `${appUrl}/set-password?token=${resetToken}`;
  
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="text-align: center; margin-bottom: 30px;">
        <h1 style="color: #2D5016; margin: 0;">Rise Local</h1>
        <p style="color: #666; margin-top: 5px;">Southwest Florida Deals</p>
      </div>
      
      <div style="background: #f9f9f9; border-radius: 8px; padding: 30px; margin-bottom: 20px;">
        <h2 style="margin-top: 0; color: #333;">Set Up Your New Password</h2>
        <p>Hi ${firstName || 'there'},</p>
        <p>Welcome back! We've updated our login system to be simpler and more secure. Click the button below to set your new password:</p>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="${setPasswordUrl}" style="background: #2D5016; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: 600;">Set Your Password</a>
        </div>
        
        <p style="color: #666; font-size: 14px;">This link will expire in 1 hour for security reasons.</p>
        <p style="color: #666; font-size: 14px;">After setting your password, you'll be able to log in using your email and new password.</p>
      </div>
      
      <div style="text-align: center; color: #999; font-size: 12px;">
        <p>Rise Local - Supporting Southwest Florida Businesses</p>
        <p>If you're having trouble with the button, copy and paste this link:<br>
        <a href="${setPasswordUrl}" style="color: #2D5016; word-break: break-all;">${setPasswordUrl}</a></p>
      </div>
    </body>
    </html>
  `;

  const text = `
Set Up Your New Password

Hi ${firstName || 'there'},

Welcome back! We've updated our login system to be simpler and more secure. Visit the link below to set your new password:

${setPasswordUrl}

This link will expire in 1 hour for security reasons.

After setting your password, you'll be able to log in using your email and new password.

Rise Local - Supporting Southwest Florida Businesses
  `;

  return sendEmail({
    to: email,
    subject: 'Set Up Your Rise Local Password',
    html,
    text
  });
}

export async function sendWelcomeEmail(
  email: string, 
  firstName: string,
  accountType: 'user' | 'business'
): Promise<{ success: boolean; error?: string }> {
  const appUrl = process.env.REPLIT_DEV_DOMAIN 
    ? `https://${process.env.REPLIT_DEV_DOMAIN}`
    : process.env.REPLIT_DEPLOYMENT_URL 
    ? `https://${process.env.REPLIT_DEPLOYMENT_URL}`
    : 'https://riselocal.replit.app';

  const businessContent = `
    <p>Your business account has been created! Here's what you can do next:</p>
    <ul>
      <li>Complete your business profile</li>
      <li>Add your first deal to attract local customers</li>
      <li>Connect with the Southwest Florida community</li>
    </ul>
  `;

  const userContent = `
    <p>Your account has been created! Here's what you can do:</p>
    <ul>
      <li>Discover exclusive deals from local businesses</li>
      <li>Save your favorite deals</li>
      <li>Consider the Rise Local Pass for premium access</li>
    </ul>
  `;

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="text-align: center; margin-bottom: 30px;">
        <h1 style="color: #2D5016; margin: 0;">Rise Local</h1>
        <p style="color: #666; margin-top: 5px;">Southwest Florida Deals</p>
      </div>
      
      <div style="background: #f9f9f9; border-radius: 8px; padding: 30px; margin-bottom: 20px;">
        <h2 style="margin-top: 0; color: #333;">Welcome to Rise Local!</h2>
        <p>Hi ${firstName || 'there'},</p>
        ${accountType === 'business' ? businessContent : userContent}
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="${appUrl}" style="background: #2D5016; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: 600;">Get Started</a>
        </div>
      </div>
      
      <div style="text-align: center; color: #999; font-size: 12px;">
        <p>Rise Local - Supporting Southwest Florida Businesses</p>
      </div>
    </body>
    </html>
  `;

  const text = `
Welcome to Rise Local!

Hi ${firstName || 'there'},

${accountType === 'business' 
  ? 'Your business account has been created! Complete your profile and add your first deal to attract local customers.'
  : 'Your account has been created! Discover exclusive deals from local businesses in Southwest Florida.'}

Visit ${appUrl} to get started.

Rise Local - Supporting Southwest Florida Businesses
  `;

  return sendEmail({
    to: email,
    subject: 'Welcome to Rise Local!',
    html,
    text
  });
}

export async function sendPasswordChangedEmail(
  email: string, 
  firstName: string
): Promise<{ success: boolean; error?: string }> {
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="text-align: center; margin-bottom: 30px;">
        <h1 style="color: #2D5016; margin: 0;">Rise Local</h1>
        <p style="color: #666; margin-top: 5px;">Southwest Florida Deals</p>
      </div>
      
      <div style="background: #f9f9f9; border-radius: 8px; padding: 30px; margin-bottom: 20px;">
        <h2 style="margin-top: 0; color: #333;">Password Changed</h2>
        <p>Hi ${firstName || 'there'},</p>
        <p>Your Rise Local password was recently changed.</p>
        <p>If you made this change, you can safely ignore this email.</p>
        <p style="color: #c00; font-weight: 600;">If you did not make this change, please contact us immediately or reset your password.</p>
      </div>
      
      <div style="text-align: center; color: #999; font-size: 12px;">
        <p>Rise Local - Supporting Southwest Florida Businesses</p>
      </div>
    </body>
    </html>
  `;

  const text = `
Password Changed

Hi ${firstName || 'there'},

Your Rise Local password was recently changed.

If you made this change, you can safely ignore this email.

If you did not make this change, please contact us immediately or reset your password.

Rise Local - Supporting Southwest Florida Businesses
  `;

  return sendEmail({
    to: email,
    subject: 'Your Rise Local Password Was Changed',
    html,
    text
  });
}
