class PdfMailer < ApplicationMailer

  def email_pdf(email, addresses, pdf)

    @message   = email['message']
    @addresses = addresses

    ##TODO: Attachment

    subject  = "Directions"
    subject += " -- #{email['subject']}"  if email['subject'].present?


    attachments['Directions.pdf'] = pdf


    mail(to: email['address'], subject: subject)
  end

end
