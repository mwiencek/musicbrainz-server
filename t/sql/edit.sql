SET client_min_messages TO 'warning';

INSERT INTO editor (id, name, password, privs, email, website, bio, member_since, email_confirm_date, last_login_date, ha1) VALUES
    (1, 'new_editor', '{CLEARTEXT}password', 1+8+32, 'test@email.com', 'http://test.website', 'biography', '1989-07-23', '2005-10-20', now(), 'e1dd8fee8ee728b0ddc8027d3a3db478'),
    (2, 'Alice', '{CLEARTEXT}secret1', 0, 'alice@example.com', 'http://example.com', 'second biography', '2007-07-23', '2007-10-20', '2009-12-05', '473045b48884c866cae27da3e4b5d618'),
    (3, 'kuno', '{CLEARTEXT}byld', 0, 'kuno@example.com', 'http://frob.nl', 'donation check test user', '2010-03-25', '2010-03-25', '2010-03-25', '7519d5878645b8944a03555ea66f1ac3');

INSERT INTO edit (id, editor, type, status, data, expire_time)
    VALUES (1, 1, 123, 1, '{ "key": "value" }', NOW());

INSERT INTO edit (id, editor, type, status, data, expire_time)
    VALUES (2, 2, 123, 1, '{ "key": "value" }', NOW());

INSERT INTO edit (id, editor, type, status, data, expire_time)
    VALUES (3, 1, 123, 1, '{ "key": "value" }', NOW());

INSERT INTO edit (id, editor, type, status, data, expire_time)
    VALUES (4, 2, 123, 2, '{ "key": "value" }', NOW());

INSERT INTO edit (id, editor, type, status, data, expire_time)
    VALUES (5, 3, 123, 1, '{ "key": "value" }', NOW());

INSERT INTO artist (id, gid, name, sort_name, comment)
    VALUES (1, '145c079d-374e-4436-9448-da92dedef3cf', 'artist', 'artist', 'Artist 1'),
           (2, '245c079d-374e-4436-9448-da92dedef3cf', 'artist', 'artist', 'Artist 2'),
           (3, '345c079d-374e-4436-9448-da92dedef3cf', 'artist', 'artist', 'Artist 3'),
           (4, '445c079d-374e-4436-9448-da92dedef3cf', 'artist', 'artist', 'Artist 4');

INSERT INTO label (id, gid, name)
    VALUES (1, '145c079d-374e-4436-9448-da92dedef3cf', 'label');

INSERT INTO edit_artist (edit, artist) VALUES (1, 1);
INSERT INTO edit_artist (edit, artist) VALUES (4, 1);
INSERT INTO edit_artist (edit, artist) VALUES (4, 2);
INSERT INTO edit_label (edit, label) VALUES (2, 1);
