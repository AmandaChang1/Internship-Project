//convert zipkin data into the viz json format
const express = require('express')
const app = express()

//hook up zipkin data into cassandra
const cassandra = require('cassandra-driver')
const client = new cassandra.Client({contactPoints: ['127.0.0.1:9042'], keyspace: 'zipkin2'}) 
var getData ='SELECT ts, trace_id, duration, Parent_id, l_service, kind FROM span' // cql query 

const HashMap = require('hashmap')

// break down Viz JSON format
 // mapping zipkin data into json format
function createNewNode(l_service, l_service) { 
  return {
    "name":l_service, "displayName":l_service,
    "notices":[
      {
        "title": l_service,"link": "http://link/to/relevant/thing", "severity": 1
      }
    ],
    "class": "normal","metadata": {}
  }
}

function createNewConnection(previousService, l_service, call) {
  return{
    "source": previousService, "target": l_service,
    "metrics": {
    "normal": call, "danger": 0,"warning": 0
    },
    "notices": [], "metadata": {}
  }
}

app.get('', function(req, res) { //created express api covert zipkin data to viz 
  client.execute(getData, [], function(err, result) {
    if(err){
      res.status(404).send({msg:err})
    }else{
      res.set('Access-Control-Allow-Origin', 'http://localhost:8080')
      res.set('content-type', 'application/json')
     
      let trace_idMap = new HashMap()
      let tracingCount = new HashMap()
      let tracingCountSameId = new HashMap()
      let i=result.rows.length-1
      let ts

      let connections= new HashMap()

      let newNodes=[{"name":"INTERNET"}]
      
      let nodes=[ // break down Viz JSON format and mapping zipkin data into it
        {
          "renderer":"region", "layout": "ltrTree","name": "LocalHost", "updated": ts, "maxVolume": 100000, "nodes": newNodes
        }
      ]

      let jsonObj={ "renderer":"global", "name": "edge","maxVolume": 100000,"entryNode": "INTERNET", nodes}

      //this o(n)loop convert zipkin data to JSON
      //hashmap - time complexity 
      while(i>=0){ 
        let trace_id=result.rows[i].trace_id
        let Parent_id=result.rows[i].Parent_id
        let l_service= result.rows[i].l_service
        ts=result.rows[i].ts.toString()

        if(!trace_idMap.has(trace_id) && Parent_id === undefined){ 
          nodes[0].updated=ts
          
          if(tracingCount.has(l_service)){
            connections.delete(l_service) 
            tracingCount.set(l_service,  tracingCount.get(l_service)+1) //represent connection with two services with count (calls) 
            //hashmap to trace how many times we call from service to service

          }else{
            tracingCount.set(l_service, 1); //first time to call
          }
          
          let newConnection = createNewConnection("INTERNET", l_service, tracingCount.get(l_service)) 
          connections.set(l_service, newConnection)  
          trace_idMap.set(trace_id, l_service)
          i--

        }else if(trace_idMap.has(trace_id) && Parent_id !== null){ 
          let newNode = createNewNode(l_service, l_service)
          newNodes.push(newNode)

          if(l_service===trace_idMap.get(trace_id)){
            i--
            continue

          }else{
            if(tracingCountSameId.has(l_service)){ 
              tracingCountSameId.set(l_service, tracingCountSameId.get(l_service)+1)
            }else{
              tracingCountSameId.set(l_service, 1)
            }
            let newConnection = createNewConnection( trace_idMap.get(trace_id), l_service, tracingCountSameId.get(l_service)) 
            connections.set(trace_idMap.get(trace_id)+l_service, newConnection)
            i--
          }
        }
    }//end of loop

    nodes[0].connections= connections.values() // convert from hashmap to array for JSON format 
    var myJson= JSON.stringify(jsonObj)
    res.send(myJson)
  }
  })
})// end of function

app.listen(3000, () => {
  console.log('Example app listening on port 3000!')
})

module.exports = app