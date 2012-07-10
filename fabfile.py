from fabric.api import *
from time import sleep
from fabric.colors import red

env.use_ssh_config = True
env.sudo_prefix = "sudo -S -p '%(sudo_prompt)s' -H " % env

def socket_deploy():
    """
    Do a Unix FastCGI socket deployment of musicbrainz-server. This works by
    restarting the process and taking down the old one if a new process could
    successful be started.
    """
    with cd("~/musicbrainz-server"):
        run("git pull --ff-only")
        run("~/musicbrainz-server/admin/socket-deploy.sh")

def no_local_changes():
    # The exit code of these will be 0 if there are no changes.
    # If there are changes, then the author should fix his damn code.
    with settings( hide("stdout") ):
        local("git diff --exit-code")
        local("git diff --exit-code --cached")

def beta():
    """
    Update the beta.musicbrainz.org server

    This requires you have a 'beta' alias in your .ssh/config file.
    """
    env.host_string = "beta"
    no_local_changes()

    with settings( hide("stdout", "stderr") ):
        local("git checkout beta")
        local("git merge master")
        local("git push origin beta")

    socket_deploy()

def test():
    """
    Update the test.musicbrainz.org server

    This requires you have a 'test' alias in your .ssh/config file.
    """
    env.host_string = "test"
    no_local_changes()

    with settings( hide("stdout", "stderr") ):
        local("git checkout next")
        local("git merge master")
        local("git push origin next")

    socket_deploy()

def production():
    """
    To upgrade the servers, first take them out of the load balancer one by
    one. Then, use Fabric to update them:

    fab production

    You will be prompted to check you wish to continue, and then prompted for a
    server to update. The Fabric deployment script will take care of taking the
    service down, running a Git pull (and running the rest of
    production-deploy.sh) and then bring the service back up.

    It will attempt to check that the server started correctly by looking at the
    tail of the log and also doing a curl against localhost.
    """
    puts("Checking if the server is quiet (expecting no requests in 5 second window)")
    with settings( hide("stdout") ):
        t1 = run("tail /var/log/nginx/001-musicbrainz.access.log")
        sleep(5)
        t2 = run("tail /var/log/nginx/001-musicbrainz.access.log")

    if t1 != t2:
        puts(red("The server does NOT appear to be quiet!"))
        cont = prompt("Do you wish to proceed?", validate=r'^(yes|no)', default='no')
        if cont == 'no':
            abort('User does not wish to proceed')

    sudo("svc -d /etc/service/mb_server-fastcgi")

    with cd('/home/musicbrainz/musicbrainz-server'):
        sudo("git pull --ff-only", user="musicbrainz")

    sudo("/home/musicbrainz/musicbrainz-server/admin/production-deploy.sh", user="musicbrainz")
    sudo("svc -u /etc/service/mb_server-fastcgi")

    puts("Waiting 20 seconds for server to start")
    sleep(20)

    sudo("/etc/init.d/nginx restart", pty=False)

    # A non-0 exit code from any of these will cause the deployment to abort
    with settings( hide("stdout") ):
        run("pgrep plackup")
        run("tail /etc/service/mb_server-fastcgi/log/main/current | grep started")
        run("wget http://localhost -O -")

def reset_test_branches():
    """
    Reset the 'next' and 'beta' branches, and do socket updates on both beta and test
    """
    no_local_changes()
    local("git checkout next")
    local("git reset --hard origin/master")
    local("git checkout beta")
    local("git reset --hard origin/master")
    local("git push --force origin next beta")

    with settings(host_string='beta'):
        with cd("/home/beta/musicbrainz-server"):
            run("git fetch")
            run("git reset --hard origin/beta")
        socket_deploy()

    with settings(host_string='beta'):
        with cd("/home/musicbrainz/musicbrainz-server"):
            run("git fetch")
            run("git reset --hard origin/next")
        socket_deploy()
