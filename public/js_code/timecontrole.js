function senddata1(){
    var http = new XMLHttpRequest();
    http.open("POST", "/startwork", true);
    http.setRequestHeader("Content-type", "application/x-www-form-urlencoded");
    http.onreadystatechange = function () {
      if (this.readyState == 4 && this.status == 200) {
          if (this.responseText == "error"){
             
          }
          else{
            
          }
          
      }
    };
    http.send("locaux="+document.getElementById("locaux").value);
}
function senddata2(locauxverif){
    var http = new XMLHttpRequest();
    http.open("POST", "/leftwork", true);
    http.setRequestHeader("Content-type", "application/x-www-form-urlencoded");
    http.onreadystatechange = function () {
      if (this.readyState == 4 && this.status == 200) {
          if (this.responseText == "error"){
             
          }
          else{
            window.location = "/";
            console.log("getit");
          }
          
      }
    };
    http.send("locaux="+locauxverif);
}