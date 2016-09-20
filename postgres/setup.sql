CREATE TABLE events (
	event_id serial,
	group_id BIGINT,
	name VARCHAR(60),
	people_list INTEGER[],
	date_event TIMESTAMP,
	location VARCHAR(60)
);
