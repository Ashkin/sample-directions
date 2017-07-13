require 'net/http'

class Api::V1::DirectionsController < Api::V1::BaseController

  skip_before_filter :verify_authenticity_token, :only => [:map]

  # GET /map
  # Returns Google Maps script
  def map
    url = "https://maps.googleapis.com/maps/api/js?key=#{ENV['GOOGLE_MAPS_API_KEY']}"
    render plain: https_get(url, verify: false).body, content_type: 'text/javascript'

  rescue StandardError => err
    render json: {status: 'error', error: err.message || 'Unknown error'}, status: 500
  end


  # POST /location/:address
  def location

    # URI builder
    uri  = 'https://maps.googleapis.com/maps/api/geocode/json?'
    uri += 'address=' + CGI::escape( params['address'] )
    uri += '&key=' + ENV['GOOGLE_MAPS_API_KEY']


    # Skip SSL verification since we have no cert.
    result = https_get(uri, verify: false)
    
    # and return the raw data
    render json: result.body, status: result.code
  end



  # POST /directions/:address1/:address2
  def directions
    address_from = params['address_from']
    address_to   = params['address_to']

    # Handle missing address(es)
    return  unless assert_addresses_exist(address_from, address_to)


    respond_to do |format|
      # Pass the json response straight through (for testing)
      format.json do
        result = get_directions_data(address_from, address_to)
        render json: result.body, status: result.code
      end

      # Construct markup and return it.
      format.html do
        markup = get_directions_markup( params['address_from'], params['address_to'] )
        render plain: markup
      end
    end


  end


  ##TODO: GET /pdf/:address_from_base64/:address_to_base64


  # POST /pdf
  def pdf
    address_from = params['address_from']
    address_to   = params['address_to']

    # Handle missing address(es)
    return  unless assert_addresses_exist(address_from, address_to)


    # Fetch directions
    markup = get_directions_markup( address_from, address_to )

    Rails.root

    kit = PDFKit.new(markup, :page_size => 'Letter')
    kit.stylesheets << Rails.root.join('app','assets','stylesheets','directions.css').to_s

    send_data kit.to_pdf, type: 'application/pdf', disposition: 'inline'

  rescue StandardError => err
    ##TODO: handle possible PDFKit errors
    render json: {status: 'error', error: 'An unknown error occured', details: err.message}
  end



  # POST /email
  def email
    # Verify email password
    unless params['email_password'] == ENV['EMAIL_PASSWORD']
      # and return a 403 if it fails
      render json: {status: 'error', error: 'Invalid password'}, status: 403
    end

    ##TODO: too many requests


    render json: {status: 'nyi', message: 'Email not yet implemented'}, status: 501
  end



  private


  def assert_addresses_exist(address_from, address_to)
    return true  if address_from.present? and address_to.present?

    errors = []
    errors << 'address_from missing'  unless address_from
    errors << 'address_to missing'    unless address_to
    render json: {status: 'error', error: errors.join('; '), details: 'assert_addresses_exist', address_from: address_from, address_to: address_to }, status: :bad_request
    return false
  end


  # Simple Net::HTTP::Get wrapper
  # HTTParty is easier, but kind of overkill for this project.
  def https_get(uri, options)
    options = options.reverse_merge(verify: true)  # Verify SSL by default

    uri  = URI.parse(uri)
    http = Net::HTTP::new(uri.host, uri.port)

    # Use SSL, but optionally skip verification
    http.use_ssl = true
    unless options[:verify]
      http.verify_mode = OpenSSL::SSL::VERIFY_NONE
    end

    # Fetch! and return response
    http.request( Net::HTTP::Get.new(uri.request_uri) )
  end


  # Fetch directions data from google.
  def get_directions_data(address_from, address_to)

    # URI builder
    uri  = 'https://maps.googleapis.com/maps/api/directions/json?'
    uri += 'origin='       + CGI::escape( params['address_from'] )
    uri += '&destination=' + CGI::escape( params['address_to'] )
    uri += '&key=' + ENV['GOOGLE_MAPS_API_KEY']


    # Skip SSL verification since we have no cert.
    return https_get(uri, verify: false)
  end


  def get_directions_markup(address_from, address_to)
    # Fetch the data and parse it
    result = get_directions_data(address_from, address_to)
    json = JSON.parse(result.body)

    # Handle: no route
    if json['routes'].empty?
      render partial: 'no_directions.erb'
      return
    end

    # Process route
    legs = json['routes'].first['legs'].first
    
    @total_distance = legs['distance']['text']
    @total_duration = legs['duration']['text']
    
    @from_address = legs['start_address']
    @to_address   = legs['end_address']
    
    @steps = legs['steps']
    
    return render_to_string partial: 'directions.erb'
  end

end
