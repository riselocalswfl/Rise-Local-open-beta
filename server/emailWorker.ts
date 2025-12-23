import { storage } from "./storage";

const EMAIL_CHECK_INTERVAL = 60000; // 1 minute

async function processEmailJobs() {
  try {
    const pendingJobs = await storage.getPendingEmailJobs();
    
    if (pendingJobs.length === 0) {
      return;
    }
    
    console.log(`[EMAIL WORKER] Processing ${pendingJobs.length} pending email jobs`);
    
    for (const job of pendingJobs) {
      try {
        // In production, this would integrate with an email service like SendGrid, Resend, etc.
        // For now, we log the email and mark it as sent
        console.log('[EMAIL] Would send email:', {
          to: job.recipientEmail,
          subject: job.subject,
          preview: job.bodyPreview
        });
        
        await storage.markEmailJobSent(job.id);
        console.log('[EMAIL] Marked job as sent:', job.id);
      } catch (error) {
        console.error('[EMAIL] Failed to process job:', job.id, error);
        await storage.markEmailJobFailed(job.id);
      }
    }
  } catch (error) {
    console.error('[EMAIL WORKER] Error processing jobs:', error);
  }
}

export function startEmailWorker() {
  console.log('[EMAIL WORKER] Starting email worker...');
  
  // Run immediately once
  processEmailJobs();
  
  // Then run on interval
  setInterval(processEmailJobs, EMAIL_CHECK_INTERVAL);
}
