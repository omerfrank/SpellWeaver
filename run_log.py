import logging
from app import create_app

app = create_app()

class No200(logging.Filter):
    def filter(self, record):
        # Filter out log records containing " 200 " (successful responses)
        return " 200 " not in record.getMessage()

if __name__ == '__main__':
    # Get the werkzeug logger and add the filter
    log = logging.getLogger('werkzeug')
    log.addFilter(No200())

    # Running with debug=True as configured in your file
    app.run(host='0.0.0.0', port=5000, debug=True)