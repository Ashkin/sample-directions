source 'https://rubygems.org'
ruby '2.4.1'

## Server ------------
gem 'unicorn'
gem 'rails', '~> 5.0.0', '>= 5.0.0.1'
gem 'puma', '~> 3.0'  # Use Puma as the app server



## Database ------------
gem 'pg'



## Assets (styles, js, etc) ------------
gem 'turbolinks', '~> 5'
gem 'sass-rails', '~> 5.0'  # Sassy!
gem 'uglifier', '>= 1.3.0'  # JS Compressor

gem 'pdfkit'              # Markup->PDF
gem 'wkhtmltopdf-binary'  # required by pdfkit; includes osx and linux binaries



## JS libraries ------------
gem 'angularjs-rails'



## Development ------------
group :development, :test do
  gem 'dotenv-rails'  # Local store for API keys, etc.
end

group :development do
  # Access an IRB console on exception pages or by using <%= console %> anywhere in the code.
  gem 'web-console'
end
