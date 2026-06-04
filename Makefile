.PHONY: test coverage run

test:
	node --test

coverage:
	node --test --experimental-test-coverage

run:
	http-serve .
