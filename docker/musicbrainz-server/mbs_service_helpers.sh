source /etc/consul_template_helpers.sh

MBS_HOME=/home/musicbrainz
MBS_ROOT=$MBS_HOME/musicbrainz-server

mbs_dependencies() {
    sv start consul-template || exit 1

    wait_for_file "$MBS_ROOT/lib/DBDefs.pm"

    if [ ! -d "$MBS_ROOT/root/static/build/" ]; then
        chpst -u musicbrainz:musicbrainz \
            env HOME=$MBS_HOME \
            /bin/sh -c "cd $MBS_ROOT; carton exec -- ./script/compile_resources.sh"
    fi
}
