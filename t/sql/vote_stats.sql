SET client_min_messages TO 'warning';

INSERT INTO edit (id, type, data, editor, status, expire_time) VALUES (666, 1, '<data />', 1, 1, NOW());
INSERT INTO vote (editor, vote, vote_time, edit)
    VALUES (1, 1, NOW(), 666),
           (1, 0, NOW(), 666),
           (1, -1, NOW(), 666),
           (1, 1, NOW(), 666),
           (1, 1, '1970-05-10', 666);
