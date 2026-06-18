all: serve

serve:
	hugo server -D

deps:
	./download-deps static
