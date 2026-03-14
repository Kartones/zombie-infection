.PHONY: test run

test:
	node --test 'tests/**/*.test.js'

run:
	http-serve .
