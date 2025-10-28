from flask import Flask, render_template

app = Flask(__name__)

@app.route("/")
def index():
    return render_template("index.html")

@app.route("/home") # the routs in the <a> tags will be filed from this routes 
def home():
    return render_template('home.html')
if __name__ == "__main__":
    app.run()