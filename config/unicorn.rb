# Define the app's root directory.  Dynamically, ofc.
rails_root = File.expand_path(File.dirname(__FILE__) + '/..')

# Define worker directory for Unicorn
working_directory rails_root

# Location of PID file
pid "#{rails_root}/tmp/pids/unicorn.pid"

# Define Log paths
stderr_path "#{rails_root}/log/unicorn.log"
stdout_path "#{rails_root}/log/unicorn.log"

# Listen on a UNIX data socket
listen "#{rails_root}/tmp/unicorn.directions.sock"

# Force port 3000 on development to ensure Unicorn is working properly
listen(3000)  if ENV['RAILS_ENV'] == 'development'


# Go forth, my minions!
worker_processes (ENV['RAILS_ENV'] == 'production' ? 4 : 2)


# Chillin' for >30sec?  Death!  (This mimics Heroku's environment)
timeout 30



# Load rails before forking workers for better worker spawn time
preload_app true


# Rails-friendly config follows:

GC.respond_to?(:copy_on_write_friendly=) and
  GC.copy_on_write_friendly = true


# Disconnect from db prior to forking  (aka: be nice to the master process)
before_fork do |server, worker|
  defined?(ActiveRecord::Base) and
    ActiveRecord::Base.connection.disconnect!
end

# and reconnect afterwards
after_fork do |server, worker|
  defined?(ActiveRecord::Base) and
    ActiveRecord::Base.establish_connection
end

