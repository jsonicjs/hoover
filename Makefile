.PHONY: all build test clean

all: build test

build:
	npm run build

test:
	npm test

clean:
	rm -rf dist dist-test
