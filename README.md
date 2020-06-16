# indegene

Database name: indegene

Collections:

        authors:
            _id
            name
            code
            dob
           
        awards:
            _id
            name
            author
            year
        
        solds:
            _id
            author
            qty
            price
            
            
            
Authors collection has a code field which will be unique code for each other.
Awards and Solds collections had a auther field which will have Authors code.

Possible API paths:

  http://localhost:3000/api/authors?n=2
  
  http://localhost:3000/api/authors?y=2000
  
  http://localhost:3000/api/totals
  
  http://localhost:3000/api/find?birthDate=1906-12-09T05:00:00.000Z&totalPrice=7000
