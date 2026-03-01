/**
 * Generate HTML email for milestone approval
 */
export function generateMilestoneApprovalEmail({
  milestoneName,
  clientName,
  clientEmail,
  status,
  comments,
  projectName
}) {
  const isApproved = status === 'Approved';
  
  return `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #3b82f6 0%, #06b6d4 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
    .content { background: white; padding: 30px; border: 1px solid #e5e7eb; }
    .status-badge { display: inline-block; padding: 8px 16px; border-radius: 6px; font-weight: bold; margin: 20px 0; }
    .approved { background: #dcfce7; color: #16a34a; }
    .rejected { background: #fee2e2; color: #dc2626; }
    .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 14px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1 style="margin: 0;">Milestone ${isApproved ? 'Approved' : 'Rejected'}</h1>
    </div>
    <div class="content">
      <p>Hello,</p>
      <p>Client <strong>${clientName}</strong> (${clientEmail}) has ${isApproved ? 'approved' : 'rejected'} the following milestone:</p>
      
      <div style="background: #f9fafb; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <p><strong>Project:</strong> ${projectName}</p>
        <p><strong>Milestone:</strong> ${milestoneName}</p>
        <div class="status-badge ${isApproved ? 'approved' : 'rejected'}">${status}</div>
      </div>

      ${comments ? `
        <div style="background: #eff6ff; border-left: 4px solid #3b82f6; padding: 15px; margin: 20px 0;">
          <p style="margin: 0;"><strong>Client Comments:</strong></p>
          <p style="margin: 10px 0 0 0;">${comments}</p>
        </div>
      ` : ''}

      <p>View full project details in the admin portal.</p>
    </div>
    <div class="footer">
      <p>Pacific Engineering & Construction Inc.</p>
      <p>470 3rd St, San Francisco, CA 94107</p>
    </div>
  </div>
</body>
</html>
  `.trim();
}

/**
 * Generate HTML email for change order approval
 */
export function generateChangeOrderApprovalEmail({
  changeOrderTitle,
  clientName,
  clientEmail,
  status,
  comments,
  costImpact,
  scheduleImpact
}) {
  const isApproved = status === 'Approved';
  
  return `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #8b5cf6 0%, #ec4899 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
    .content { background: white; padding: 30px; border: 1px solid #e5e7eb; }
    .status-badge { display: inline-block; padding: 8px 16px; border-radius: 6px; font-weight: bold; margin: 20px 0; }
    .approved { background: #dcfce7; color: #16a34a; }
    .rejected { background: #fee2e2; color: #dc2626; }
    .impact-box { background: #fef3c7; padding: 15px; border-radius: 6px; margin: 15px 0; }
    .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 14px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1 style="margin: 0;">Change Order ${isApproved ? 'Approved' : 'Rejected'}</h1>
    </div>
    <div class="content">
      <p>Hello,</p>
      <p>Client <strong>${clientName}</strong> (${clientEmail}) has ${isApproved ? 'approved' : 'rejected'} a change order:</p>
      
      <div style="background: #f9fafb; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <p><strong>Change Order:</strong> ${changeOrderTitle}</p>
        <div class="status-badge ${isApproved ? 'approved' : 'rejected'}">${status}</div>
      </div>

      <div class="impact-box">
        <p style="margin: 0;"><strong>Cost Impact:</strong> $${Math.abs(costImpact || 0).toLocaleString()}</p>
        <p style="margin: 10px 0 0 0;"><strong>Schedule Impact:</strong> ${scheduleImpact || 0} days</p>
      </div>

      ${comments ? `
        <div style="background: #eff6ff; border-left: 4px solid #3b82f6; padding: 15px; margin: 20px 0;">
          <p style="margin: 0;"><strong>Client Comments:</strong></p>
          <p style="margin: 10px 0 0 0;">${comments}</p>
        </div>
      ` : ''}

      <p>View full project details in the admin portal.</p>
    </div>
    <div class="footer">
      <p>Pacific Engineering & Construction Inc.</p>
      <p>470 3rd St, San Francisco, CA 94107</p>
    </div>
  </div>
</body>
</html>
  `.trim();
}

/**
 * Generate signature confirmation email
 */
export function generateSignatureConfirmationEmail({
  signerName,
  documentType,
  documentTitle,
  signedDate
}) {
  return `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
    .content { background: white; padding: 30px; border: 1px solid #e5e7eb; }
    .checkmark { font-size: 48px; color: #10b981; text-align: center; margin: 20px 0; }
    .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 14px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1 style="margin: 0;">✓ Document Signed Successfully</h1>
    </div>
    <div class="content">
      <div class="checkmark">✓</div>
      <p>Dear ${signerName},</p>
      <p>Thank you for signing the ${documentType}. This email confirms your electronic signature has been securely recorded.</p>
      
      <div style="background: #f0fdf4; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #10b981;">
        <p style="margin: 0;"><strong>Document:</strong> ${documentTitle}</p>
        <p style="margin: 10px 0 0 0;"><strong>Signed:</strong> ${new Date(signedDate).toLocaleString()}</p>
      </div>

      <p>A copy of the signed document is available in your client portal.</p>
      
      <p style="margin-top: 30px;">Best regards,<br><strong>Pacific Engineering Team</strong></p>
    </div>
    <div class="footer">
      <p>Pacific Engineering & Construction Inc.</p>
      <p>470 3rd St, San Francisco, CA 94107 | (415)-419-6079 | dylanl.peci@gmail.com</p>
    </div>
  </div>
</body>
</html>
  `.trim();
}