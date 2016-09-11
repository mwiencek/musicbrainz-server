requires 'perl' => '5.18.2';

# Mandatory modules
requires 'Algorithm::Diff'                            => '1.1902';
requires 'Authen::Passphrase'                         => '0.008';
requires 'Captcha::reCAPTCHA'                         => '0.97';
requires 'Catalyst::Action::RenderView'               => '0.16';
requires 'Catalyst::Plugin::Authentication'           => '0.10023';
requires 'Catalyst::Authentication::Credential::HTTP' => '1.016';
requires 'Catalyst::Plugin::Cache'                    => '0.12';
requires 'Catalyst::Plugin::StackTrace'               => '0.12';
requires 'Catalyst::Plugin::Unicode::Encoding'        => '99.0';
requires 'Catalyst::Runtime'                          => '5.90097';
requires 'Catalyst::View::TT'                         => '0.41';
requires 'CGI::Expand'                                => '2.05';
requires 'Class::MOP'                                 => '2.1600';
requires 'Class::Load'                                => '0.20';
requires 'Clone'                                      => '0.36';
requires 'Cwd'                                        => '3.40';
requires 'Data::Compare'                              => '1.22';
requires 'Data::Dumper::Concise'                      => '2.021';
requires 'Data::OptList'                              => '0.109';
requires 'Data::Page'                                 => '2.02';
requires 'Date::Calc'                                 => '6.3';
requires 'Data::UUID::MT'                             => '1.000';
requires 'DateTime::TimeZone'                         => '1.63';
requires 'DateTime::Format::Pg'                       => '0.16009';
requires 'DateTime::Format::Natural'                  => '1.02';
requires 'DateTime::Format::ISO8601'                  => '0.08';
requires 'DateTime::Format::W3CDTF'                   => '0.06';
requires 'DBIx::Connector'                            => '0.53';
requires 'DBD::Pg'                                    => '2.19.3';
requires 'DBI'                                        => '1.63';
requires 'Digest::HMAC_SHA1'                          => '1.03';
requires 'Digest::MD5'                                => '2.52';
requires 'Digest::SHA'                                => '5.86';
requires 'Email::Address'                             => '1.900';
requires 'Email::MIME'                                => '1.925';
requires 'Email::MIME::Creator'                       => '1.925';
requires 'Email::Sender'                              => '1.300010';
requires 'Email::Valid'                               => '1.192';
requires 'Encode::Detect'                             => '1.01';
requires 'Exception::Class'                           => '1.37';
requires 'File::Spec'                                 => '3.40';
requires 'GnuPG'                                      => '0.19';
requires 'Hash::Merge'                                => '0.200';
requires 'HTML::FormHandler'                          => '0.40063';
requires 'HTML::Tiny'                                 => '1.05';
requires 'HTML::TreeBuilder::XPath'                   => '0.14';
requires 'HTTP::Date'                                 => '6.02';
requires 'IO::All'                                    => '0.54';
requires 'JSON'                                       => '2.61';
requires 'JSON::XS'                                   => '2.34';
requires 'List::AllUtils'                             => '0.03';
requires 'List::MoreUtils'                            => '0.33';
requires 'List::UtilsBy'                              => '0.09';
requires 'LWP::Protocol::https'                       => '6.04';
requires 'Log::Dispatch'                              => '2.41';
requires 'Math::Random::Secure'                       => '0.06';
requires 'Method::Signatures::Simple'                 => '1.07';
requires 'MIME::Base64'                               => '3.13';
requires 'Module::Pluggable'                          => '5.1';
requires 'Moose'                                      => '2.1600';
requires 'MooseX::ABC'                                => '0.06';
requires 'MooseX::Clone'                              => '0.05';
requires 'MooseX::Getopt'                             => '0.59';
requires 'MooseX::MethodAttributes'                   => '0.29';
requires 'MooseX::Role::Parameterized'                => '1.08';
requires 'MooseX::Runnable'                           => '0.09';
requires 'MooseX::Singleton'                          => '0.29';
requires 'MooseX::Types'                              => '0.41';
requires 'MooseX::Types::Structured'                  => '0.30';
requires 'MooseX::Types::URI'                         => '0.05';
requires 'MRO::Compat'                                => '0.12';
requires 'Net::Amazon::AWSSign'                       => '0.12';
requires 'Plack'                                      => '1.0030';
requires 'Unicode::ICU::Collator'                     => '0.002';
requires 'REST::Utils'                                => '0.6';
requires 'Readonly'                                   => '1.04';
requires 'Redis'                                      => '1.967';
requires 'Set::Scalar'                                => '1.27';
requires 'Statistics::Basic'                          => '1.6607';
requires 'String::CamelCase'                          => '0.02';
requires 'String::ShellQuote'                         => '1.03';
requires 'String::TT'                                 => '0.03';
requires 'Sys::Hostname'                              => '1.17';
requires 'Template::Plugin::Class'                    => '0.13';
requires 'Template::Plugin::JavaScript'               => '0.02';
requires 'Template::Plugin::JSON::Escape'             => '0.02';
requires 'Text::Diff3'                                => '0.10';
requires 'Text::Markdown'                             => '1.000026';
requires 'Text::WikiFormat'                           => '0.81';
requires 'Text::Unaccent'                             => '1.08';
requires 'Text::Trim'                                 => '1.02';
requires 'Throwable'                                  => '0.200009';
requires 'URI'                                        => '1.69';
requires 'XML::Parser::Lite'                          => '0.719';
requires 'XML::RSS::Parser::Lite'                     => '0.10';
requires 'XML::Simple'                                => '2.20';
requires 'XML::XPath'                                 => '1.13';

# ETag Caching
feature etags => sub {
    requires 'Catalyst::Plugin::Cache::HTTP'    => '0.001000';
};

# Default caching setup
feature caching => sub {
    requires 'Cache::Memory'    => '2.09';
};

# Default session store/state management
feature sessions => sub {
    requires 'Catalyst::Plugin::Session::State::Cookie'     => '0.17';
};

# Production server features
feature production => sub {
    requires 'Digest::MD5::File'                => '0.08';
    requires 'Catalyst::Plugin::ErrorCatcher'   => '0.0.8.18';
    requires 'Server::Starter'                  => '0.31';
    requires 'Starlet'                          => '0.25';
};

# Internationalization
feature i18n => sub {
    requires 'Locale::PO'       => '0.27';
    requires 'Locale::Messages' => '1.23';
};

author_requires 'Catalyst::Devel'               => '1.39';
author_requires 'Plack::Middleware::Debug'      => '0.14';
author_requires 'Test::EOL';
author_requires 'Test::NoTabs';

# Broken in Perl >= 5.22
# test_requires 'Coro';
test_requires 'HTML::HTML5::Parser';
test_requires 'HTML::HTML5::Sanity';
test_requires 'HTML::Selector::XPath';
test_requires 'LWP::UserAgent::Mockable';
test_requires 'Test::Aggregate';
test_requires 'Test::Differences';
test_requires 'Test::Fatal' => '0.006';
test_requires 'Test::JSON';
test_requires 'Test::LongString';
test_requires 'Test::Magpie' => '0.04';
test_requires 'Test::Memory::Cycle';
test_requires 'Test::Mock::Class';
test_requires 'Test::Routine';
test_requires 'Test::WWW::Mechanize::Catalyst' => '0.59';
test_requires 'Test::XPath';
test_requires 'XML::Parser';
test_requires 'XML::SemanticDiff' => '1.0000';
test_requires 'TAP::Parser::SourceHandler::pgTAP';
