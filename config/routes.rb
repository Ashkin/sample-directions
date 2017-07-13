Rails.application.routes.draw do
  # root
  get  '/',      to: 'directions#index'

  # API below
  namespace :api do
    namespace :v1 do
      namespace :directions do
        get  '/map',      action: 'map'
        post '/location', action: 'location'
        post '/',         action: 'directions'
        post '/pdf',      action: 'pdf'
        post '/email',    action: 'email'
      end
    end
  end

end
