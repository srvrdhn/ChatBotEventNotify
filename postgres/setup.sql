CREATE TABLE events (
	event_id serial,
	group_id INT,
	name VARCHAR(60),
	people_list INTEGER[],
	date_event DATE
);