const express = require('express');
const jwt = require('jsonwebtoken');
const cors = require('cors')
const cookieParser = require('cookie-parser');
const JWT_SECRET = "mynamerahul" // Create some jwt_secret and add it to environment variable for safety
const DATA_PATH = __dirname + '/todos.json'
const fs = require('fs');
const { userInfo } = require('os');
const port = 3000;

const app = express();
app.use(cookieParser());
app.use(express.json());
app.use(cors({
    origin: 'http://localhost:'+port,
    credentials: true
}));

app.get('/', function(req, res){
    res.redirect('/signup');
})

app.get('/signup', function(req, res){
    res.sendFile(__dirname + "/public/signup.html")    
});

app.get('/login', function(req, res){
    res.sendFile(__dirname + "/public/login.html")
});


app.post('/signup', function(req, res){
    const username = req.body.username; 
    const password = req.body.password; 
    const email = req.body.email;

    const filePath = 'todos.json';
    const defaultContent = {
    "Accounts": []
    };

    if (!fs.existsSync(filePath)) {
        fs.writeFileSync(filePath, JSON.stringify(defaultContent, null, 4));
        console.log("todos.json created.");
    }


    let jsonData = fs.readFileSync(DATA_PATH, 'utf-8')
    jsonData = JSON.parse(jsonData);
    // console.log(jsonData);
    let isUserFound = jsonData.Accounts.find(u => u.email === email);
    if(isUserFound){
        res.status(404).json({
            message: "Email id already registered"
        })
    }   
    else{
        jsonData.Accounts.push({
            "username": username, 
            "password": password,
            "email": email, 
            "lastSpaceId": 0, 
            "spaces": []
        })
        jsonData = JSON.stringify(jsonData, null, 4);
        fs.writeFile(__dirname +'/todos.json', jsonData, (err)=>{
            if(err){
                console.error("Error adding account to the server");
                res.status(500).json({
                    message: "Error adding account to the server"
                })
            }
            else{
                console.log("Account added to todos.json file");
                res.json({
                    message: "Signed Up Succesfully"
                })
            }
        })
        
    } 
    

})

app.post('/login', function(req, res){
    const email = req.body.email;
    const password = req.body.password; 
    let jsonData = fs.readFileSync(DATA_PATH, 'utf-8')
    jsonData = JSON.parse(jsonData);
    console.log(jsonData)
    const isUserFound = jsonData.Accounts.find(u => {
        if(u.email === email && u.password === password){
            return true
        }
        else{
            return false
        }
    })
    if(isUserFound){
        const token = jwt.sign({
            email : email, 
            username : isUserFound.username
        }, JWT_SECRET);

        res.cookie('token', token, {
            httpOnly: true, // not accessible from JavaScript (for security)
            secure: false, // set to true in production with HTTPS
            sameSite: 'strict'
        });

        res.json({
            message: "Login Successful"
        })
    }
    else{
        res.status(404).json({
            message: "Email or password incorrect"
        })
    }
})

function auth(req, res, next){
    const token = req.cookies.token;
    // console.log(token);
    try{
        const userInfo = jwt.verify(token, JWT_SECRET);
        const username = userInfo.username;
        const email = userInfo.email;
        req.username = username;
        req.email = email;
        // console.log(userInfo);
        next();
    }   
    catch(error){
        res.status(404).send({
            message: "User is not logged in"
        })
    }
}


app.use(auth);
app.get('/space', function(req, res){
    res.sendFile(__dirname + '/public/spaces.html');
})

app.get('/logout', function(req, res){
    res.clearCookie('token');
    res.send('Logged out and cookie cleared');
});

app.get('/getUserInfo', function(req, res){
    const email = req.email;
    let jsonData = fs.readFileSync(DATA_PATH, 'utf-8')
    jsonData = JSON.parse(jsonData);
    const userInfo = jsonData.Accounts.find(u=>u.email === email);
    let spaces = []
    for(let i = 0;i<userInfo.spaces.length;i++){
        spaces.push({
            id: userInfo.spaces[i].SpaceId,
            spaceName: userInfo.spaces[i].name
        })
    }
    res.json({
        username: req.username, 
        spaces : spaces
    })
})

app.post('/createSpace', function(req, res){
    const email = req.email;
    const newSpaceName = req.body.newSpaceName;
    let jsonData = fs.readFileSync(DATA_PATH, 'utf-8')
    jsonData = JSON.parse(jsonData);
    // console.log(jsonData);
    let isUserFound = jsonData.Accounts.find(u => u.email === email);
    // console.log(isUserFound);
    let lastSpaceId = isUserFound.lastSpaceId;
    isUserFound.spaces.push({
        "SpaceId": lastSpaceId+1,
        "name": newSpaceName,
        "lastTaskId": 0,
        "Tasks" : []
    })
    isUserFound.lastSpaceId+=1;
    jsonData = JSON.stringify(jsonData, null, 4);
    fs.writeFile(DATA_PATH, jsonData, (err)=>{
        if(err){
            console.error("error adding space to the server");
            res.status(500).json({
                message: "error adding space to the server"
            })
        }
        else{
            console.log("new space added to todos.json file");
            res.json({
                message: "New space added succesfully"
            })
        }
    })
})



app.delete('/deleteSpace', function(req, res){

    const email = req.email;
    // console.log(req);
    const spaceId = req.body.spaceId;
    let jsonData = fs.readFileSync(DATA_PATH, 'utf-8')
    jsonData = JSON.parse(jsonData);
    // console.log(jsonData);
    let isUserFound = jsonData.Accounts.find(u => u.email === email);
    // console.log(isUserFound);
    isUserFound.spaces = isUserFound.spaces.filter(space => space.SpaceId !== spaceId);
    if(isUserFound.spaces.length == 0){
        isUserFound.lastSpaceId = 0;
    }
    jsonData = JSON.stringify(jsonData, null, 4);

    fs.writeFile(DATA_PATH, jsonData, (err)=>{
        if(err){
            console.error("error deleting space to the server");
            res.status(500).json({
                message: "error deleting space to the server"
            })
        }
        else{
            console.log("Space with spaceid: "+ spaceId +" is deleted from todos.json file");
            res.json({
                message: "space deleted succesfully"
            })
        }
    })
})

function checkSpaceId(req, res, next){
    const email = req.email;
    let jsonData = fs.readFileSync(DATA_PATH, 'utf-8')
    jsonData = JSON.parse(jsonData);
    // console.log(jsonData);
    const spaceId = Number(req.params.spaceId);
    // console.log(spaceId);
    let isUserFound = jsonData.Accounts.find(u => u.email === email);
    // console.log(isUserFound);
    let isSpacePresent = isUserFound.spaces.find(s => s.SpaceId === spaceId);
    // console.log(isSpacePresent);
    if(isSpacePresent){
        req.spaceId = spaceId;
        next();
    }
    else{
        res.json({
            message: "Space Not found"
        })
    }
    
}

app.get("/space/:spaceId",checkSpaceId, function(req, res){
    const spaceId = req.spaceId;
    res.sendFile(__dirname + '/public/todos.html');
})

app.get("/space/:spaceId/getTodos", checkSpaceId, function(req,res){
    const email = req.email;
    const spaceId = req.spaceId;
    let jsonData = fs.readFileSync(DATA_PATH, 'utf-8')
    jsonData = JSON.parse(jsonData);
    // console.log(spaceId);
    let isUserFound = jsonData.Accounts.find(u => u.email === email);
    // console.log(isUserFound);
    let isSpacePresent = isUserFound.spaces.find(s => s.SpaceId === spaceId);
    let Tasks = isSpacePresent.Tasks;
    const spaceName = isSpacePresent.name;
    // console.log(Tasks);
    res.json({
        Tasks: Tasks, 
        spaceName: spaceName
    })
})

app.post("/space/:spaceId/taskdone",checkSpaceId, function(req, res){
    const email = req.email;
    const spaceId = req.spaceId;
    const taskId = req.body.taskId
    let jsonData = fs.readFileSync(DATA_PATH, 'utf-8')
    jsonData = JSON.parse(jsonData);
    // console.log(spaceId);
    let isUserFound = jsonData.Accounts.find(u => u.email === email);
    // console.log(isUserFound);
    let isSpacePresent = isUserFound.spaces.find(s => s.SpaceId === spaceId);
    let isTaskPresent = isSpacePresent.Tasks.find(t => t.taskId === taskId);
    console.log(isTaskPresent);
    isTaskPresent.done = true;
    
    jsonData = JSON.stringify(jsonData, null, 4);

    fs.writeFile(DATA_PATH, jsonData, (err)=>{
        if(err){
            console.error("error checking Task to the server");
            res.status(500).json({
                message: "error checking Task to the server"
            })
        }
        else{
            console.log("Task checked in todos.json file");
            res.json({
                message: "Task checked"
            })
        }
    })
})

app.post("/space/:spaceId/taskundone", checkSpaceId, function(req, res){
    const email = req.email;
    const spaceId = req.spaceId;
    const taskId = req.body.taskId
    let jsonData = fs.readFileSync(DATA_PATH, 'utf-8')
    jsonData = JSON.parse(jsonData);
    // console.log(spaceId);
    let isUserFound = jsonData.Accounts.find(u => u.email === email);
    // console.log(isUserFound);
    let isSpacePresent = isUserFound.spaces.find(s => s.SpaceId === spaceId);
    let isTaskPresent = isSpacePresent.Tasks.find(t => t.taskId === taskId);
    console.log(isTaskPresent);
    isTaskPresent.done = false;
    jsonData = JSON.stringify(jsonData, null, 4);

    fs.writeFile(DATA_PATH, jsonData, (err)=>{
        if(err){
            console.error("error unchecking Task to the server");
            res.status(500).json({
                message: "error unchecking Task to the server"
            })
        }
        else{
            console.log("Task unchecked in todos.json file");
            res.json({
                message: "Task unchecked"
            })
        }
    })
})

app.post("/space/:spaceId/addTask", checkSpaceId, function(req, res){
    const email = req.email;
    const spaceId = req.spaceId;
    const taskText = req.body.taskText;
    let jsonData = fs.readFileSync(DATA_PATH, 'utf-8')
    jsonData = JSON.parse(jsonData);
    // console.log(spaceId);
    let isUserFound = jsonData.Accounts.find(u => u.email === email);
    // console.log(isUserFound);
    let isSpacePresent = isUserFound.spaces.find(s => s.SpaceId === spaceId);
    let lastTaskId = isSpacePresent.lastTaskId;
    isSpacePresent.Tasks.push({
        taskId: lastTaskId+1, 
        task: taskText, 
        done: false
    })
    isSpacePresent.lastTaskId += 1;
    jsonData = JSON.stringify(jsonData, null, 4);

    fs.writeFile(DATA_PATH, jsonData, (err)=>{
        if(err){
            console.error("error adding Task to the server");
            res.status(500).json({
                message: "error adding Task to the server"
            })
        }
        else{
            console.log("Task added in todos.json file");
            res.json({
                message: "Task added"
            })
        }
    })
})

app.post("/space/:spaceId/deleteTask", checkSpaceId, function(req, res){
    const email = req.email;
    const spaceId = req.spaceId;
    const taskId = req.body.taskId;
    let jsonData = fs.readFileSync(DATA_PATH, 'utf-8')
    jsonData = JSON.parse(jsonData);
    // console.log(spaceId);
    let isUserFound = jsonData.Accounts.find(u => u.email === email);
    // console.log(isUserFound);
    let isSpacePresent = isUserFound.spaces.find(s => s.SpaceId === spaceId);
    isSpacePresent.Tasks = isSpacePresent.Tasks.filter(t => t.taskId !== taskId);
    if(isSpacePresent.Tasks.length == 0){
        isSpacePresent.lastTaskId = 0;
    } 

    jsonData = JSON.stringify(jsonData, null, 4);

    fs.writeFile(DATA_PATH, jsonData, (err)=>{
        if(err){
            console.error("error deleting Task to the server");
            res.status(500).json({
                message: "error deleting Task to the server"
            })
        }
        else{
            console.log("Task deleted in todos.json file");
            res.json({
                message: "Task deleted"
            })
        }
    })
})

app.listen(port, ()=>{
    console.log("Server is listening to http://localhost:"+port+"/");
})