.PHONY: test run

test:
	node --test

run:
	http-serve .
