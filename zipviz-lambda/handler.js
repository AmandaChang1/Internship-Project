module.exports.data = async (event, context, callback) => {

  console.log("======================= database =======================")
const mysql= require('mysql')
const con = await mysql.createConnection({ 
  host: "gtmzipkin-cluster-1.cluster-ro-cglxrdop2gmv.us-west-2.rds.amazonaws.com",
  user: "rootuser",
  password: "zipkin-1",
  database: "zipkin"
})

const HashMap = require('hashmap')

function createNewNode(endpoint_service_name, endpoint_service_name) { 
  return {
    "name":endpoint_service_name, "displayName":endpoint_service_name,
    "notices":[
      {
        "title":endpoint_service_name,"link": "http://link/to/relevant/thing", "severity": 1
      }
    ],
    "class": "normal","metadata": {}
  }
}

function createNewConnection(previousService, service, call) {
  return{
    "source": previousService, "target": service,
    "metrics": {
    "normal": call, "danger": 0,"warning": 0
    },
    "notices": [], "metadata": {}
  }
}


console.log("======================= query =======================")
await con.query(`
SELECT 
      zipkin_spans.trace_id, zipkin_spans.id, zipkin_spans.parent_id, zipkin_spans.start_ts, zipkin_annotations.span_id, zipkin_annotations.endpoint_service_name
    FROM zipkin_annotations 
    INNER JOIN (
    SELECT DISTINCT zipkin_spans.trace_id
      FROM zipkin_spans
      WHERE zipkin_spans.start_ts >= 1533031199000000 and zipkin_spans.start_ts <= 1533117599000000    
      LIMIT 100
        ) as zs2 ON zipkin_annotations.trace_id = zs2.trace_id
      INNER JOIN zipkin_spans ON zipkin_annotations.trace_id = zipkin_spans.trace_id
      WHERE zipkin_spans.id = zipkin_annotations.span_id 
      AND zipkin_annotations.a_key = 'sr'
      ORDER BY zipkin_spans.trace_id, zipkin_spans.parent_id DESC;
      ` , function(err, result, fields){ 
        console.log(err)
        console.log(result)
        //if(err) throw err;
      
      let trace_idMap = new HashMap()
      let tracingCount = new HashMap()
      let tracingCountSameId = new HashMap()
      
      let start_ts
      let endpoint_service_name

      let connections= new HashMap()

      let newNodes=[{"name": endpoint_service_name}]
      
      let nodes=[
        {
          "renderer":"region", "layout": "ltrTree","name": "LocalHost", "updated": start_ts, "maxVolume": 100000, "nodes": newNodes
        }
      ]

      let jsonObj={ "renderer":"global", "name": "edge","maxVolume": 100000,"entryNode": "INTERNET", nodes}

      console.log("======================= loop =======================")
      for(let i = result.length-1; i>=0; i--){
        let trace_id=result[i].trace_id
        let parent_id=result[i].parent_id
        endpoint_service_name=result[i].endpoint_service_name
        start_ts=result[i].start_ts.toString()

        if(!trace_idMap.has(trace_id) && parent_id === null){ 
          nodes[0].updated=start_ts

          if(tracingCount.has(endpoint_service_name)){
            connections.delete(endpoint_service_name)
            tracingCount.set(endpoint_service_name,  tracingCount.get(endpoint_service_name)+1)

          }else{
            tracingCount.set(endpoint_service_name, 1);
          }

          newNodes[0].name=endpoint_service_name
          trace_idMap.set(trace_id, endpoint_service_name)
         

        }else if(!trace_idMap.has(trace_id) && parent_id !== null){ // for handling bad data, trace id with no parent_id= null, we dont know start point
          continue
          

        }else if(trace_idMap.has(trace_id) && parent_id !== null){ 
          let newNode = createNewNode(endpoint_service_name, endpoint_service_name)
          newNodes.push(newNode)

          if(tracingCountSameId.has(endpoint_service_name)){
            tracingCountSameId.set(endpoint_service_name, tracingCountSameId.get(endpoint_service_name)+1)
          }else{
            tracingCountSameId.set(endpoint_service_name, 1)
          }

          let newConnection = createNewConnection(trace_idMap.get(trace_id), endpoint_service_name, tracingCountSameId.get(endpoint_service_name)) 
            connections.set(trace_idMap.get(trace_id)+endpoint_service_name, newConnection)
            trace_idMap.set(trace_id, endpoint_service_name)

        }
    }//end of loop
      nodes[0].connections= connections.values()
      //var myJson= JSON.stringify(jsonObj)
      //res.send(myJson)
      
      console.log("======================= between JSON =======================")
      const response = {
        
        statusCode: 200,
        headers: {
          'Access-Control-Allow-Origin' :'*',
          'content-type': 'application/json'
        },
        body: JSON.stringify(jsonObj)
        
      };

      console.log("======================= after JSON =======================")
      console.log(response)
      callback(null, response);
  })

};

