CREATE TABLE events (
	event_id serial,
	group_id BIGINT,
	name VARCHAR(60),
	people_list INTEGER[],
	date_event DATE,
	location VARCHAR(60)
);
