CREATE TABLE events (
	event_id INT serial,
	group_id INT,
	name VARCHAR(60),
	people_list INTEGER[],
	date_event DATE
)

# TODO Figure out date format for DB