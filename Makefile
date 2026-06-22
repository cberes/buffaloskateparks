all: serve

serve:
	hugo server -D

deps:
	./download-deps static/vendor

resize:
	find content/*/*/images -name "*.jpg" -exec mogrify -resize 1920x1080 {} \;
	find static/images -name "*.jpg" -exec mogrify -resize 1920x1080 {} \;
