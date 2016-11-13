## Separation of grammar and semantic actions
 
* special marking for empty optional node? 
* terminal and noneTerminal names must be unique! add validation 
* implicitly defined rules for DSL methods.
* support both?:
  - simple by order ????
    * Perhaps not needed? only dictionary style?
  - dictionary style

* custom names for implicitly defined rules.
  -  ```JavaScript
     $.OPTION("items", function() {
                $.SUBRULE($.value);
                $.MANY("values", function() {
                    $.CONSUME(Comma);
                    $.SUBRULE2($.value);
                });
            });
     ```       
  - performance impact/mitigation for multiple args support due to the names arg being first
  
  - unique name per OR alternative
  
  - validations 
    - duplicate custom names?
    - disallow "_" in rule names for easy creation of combined names
    - none existent listener method names.
      * we can only know the top level names at "design" time.
    
  - Collect at semantic level not at unique text location identifier level???
    -  so with the value example above we will have only ctx.value that will contain both those in the many
       and outside the many.
    - does this conflict with the implicit rules? or can be combined?
    
  - no implicit cst output unless a name has been explicitly provided?
   
  - if appears multiple times or in an iteration --> output array?
    - performance, cache results of this calculations.
    
    
    
* activating semantics directly on implicit rules using package namespace
  "items_values"
  - how to avoid name collisions? (disallow "_" in valid rule name) ? 
    
  
  
       
