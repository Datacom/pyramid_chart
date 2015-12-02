var resetTabCharts 
var _data = {};
var original_data
var _council_bounds = {};
var _region_bounds = {};
var _auth_dict = {};
var _region_dict = {};
var _title_text = {};
var small_chart_height = 150;

var donut_inner = 43
var donut_outer = 70
var donut_height = 150

var valueAccessor =function(d){return d.value < 1 ? 0 : d.value}
var age_charts;

var getkeys;
//---------------------CLEANUP functions-------------------------

function cleanup(d) {

  d.Area = titleCase(d.Area)
  d.year = +d['Year at 30 June']
  d.sexAge = d.Sex + ', '+ d.Age
  d.sexRegion =  d.Sex + ', '+ d.Area
  
  return d;
}


//---------------------------crossfilter reduce functions---------------------------

// we only use the built in reduceSum(<what we are summing>) here

//----------------------------Accessor functions-------------------------------------

// because we are only using default reduce functions, we don't need any accessor functions either 

//-------------------------Load data and dictionaries ------------------------------

//Here queue makes sure we have all the data from all the sources loaded before we try and do anything with it. It also means we don't need to nest D3 file reading loops, which could be annoying. 

queue()
    .defer(d3.csv,  "data/demographic_data.csv")
   // .defer(d3.csv,  "dictionaries/NMS_authority_dict.csv")
    .defer(d3.csv,  "dictionaries/titles.csv")
    .await(showCharts);

function showCharts(err, data, title_text) {

//We use dictionary .csv's to store things we might want to map our data to, such as codes to names, names to abbreviations etc.
  
//titles.csv is a special case of this, allowing for the mapping of text for legends and titles on to the same HTML anchors as the charts. This allows clients to update their own legends and titles by editing the csv rather than monkeying around in the .html or paying us to monkey around with the same.    
  
  var councilNames = [];
  
  for (i in title_text){
        entry = title_text[i]
        //trimAll(entry)
        name = entry.id
        _title_text[name]=entry;     
  }
  
//  for (i in auth_dict) {
//    entry = auth_dict[i]
//    trimAll(entry)
//    name = entry.Name
//    councilNames.push(name);
//    _auth_dict[entry.Name]=entry;
//  } 


  for (i in data) {
    data[i] = cleanup(data[i]);
  }
  _data = data;

 
//------------Puts legends and titles on the chart divs and the entire page---------------   
  apply_text(_title_text)

//---------------------------------FILTERS-----------------------------------------
  ndx = crossfilter(_data); // YAY CROSSFILTER! Unless things get really complicated, this is the only bit where we call crossfilter directly. 

//--------------------------Count of records---------------------------------------  
  
  
//  dc.dataCount(".dc-data-count")
//    .dimension(ndx)
//    .group(ndx.groupAll());  
  
//---------------------------ORDINARY CHARTS --------------------------------------
  year = ndx.dimension(function(d) {return d.year});
  year_group = year.group().reduceSum(function(d){return d.Value});
 
  
  year_chart = dc.barChart('#year')
    .dimension(year)
    .group(year_group)
    .valueAccessor(valueAccessor)
    .x(d3.scale.ordinal())
    .xUnits(dc.units.ordinal)
    .transitionDuration(200)
    .height(small_chart_height)
    .colors(default_colors)
    .elasticX(false)
    .elasticY(true)
    .centerBar(false)
    .brushOn(false);
  
  
  
  year_chart.on('postRender.year', function(chart){
      chart.filter(2015)
      dc.redrawAll();
      chart.selectAll('rect.bar').on('click.singleFiler', function(d,i){
        year_chart.filterAll();
        year_chart.filter(d.data.key);
        dc.redrawAll();
      })  
  })
  
  
  year_chart.xAxis().ticks(4).tickFormat(d3.format('d'));
  year_chart.yAxis().ticks(4).tickFormat(integer_format)

  
  age = ndx.dimension(function(d) {return d.sexAge});
  age_group = age.group().reduceSum(function(d){return d.Value})
   
//
  age_chart = pyramidChart('#tree')
    .dimension(age)
    .group(age_group)
    .valueAccessor(valueAccessor)
    .colors(d3.scale.ordinal().range(['#f0bdbd','#c8c8ff']))
    .colorAccessor(function(d){return d.key[0]})
    .leftColumn(function(d){return d.key[0] == 'M'}) // return true if entry is to go in the left column. Defaults to i%2 == 0, i.e. every second one goes to the right.
   .rowAccessor(function(d){return +d.key.split(' ')[1].split('-')[0]}) // return the row the group needs to go into.
    //.rowOrdering(d3.ascending) //defaults to d3.descending
    //.rowOrdering([0, 75, 15, 20, 25, 85, 30, 35, 40, 45, 50, 5, 55, 60, 65, 70, 10, 80, 85])
    .transitionDuration(1000)
    .height(600)
    //.title(function(d,i){return i})
    //.label(function(){return ' '})
    .elasticX(true)
    .labelOffsetX(20)

  age_chart.xAxis().tickFormat(function(x) {return d3.format('s')(Math.abs(x))})
  
  region = ndx.dimension(function(d) {return d.sexRegion});
  region_group = region.group().reduceSum(function(d){return d.Value})
   
//
  region_chart = pyramidChart('#region')
    .dimension(region)
    .group(region_group)
    .valueAccessor(valueAccessor)
    .colors(d3.scale.ordinal().range(['#f0bdbd','#c8c8ff']))
    .colorAccessor(function(d){return d.key[0]})
    .leftColumn(function(d){return d.key[0] == 'M'}) // return true if entry is to go in the left column. Defaults to i%2 == 0, i.e. every second one goes to the right.
   .rowAccessor(function(d){return d.key.split(', ')[1]}) // return the row the group needs to go into.
    //.rowOrdering(d3.ascending) //defaults to d3.descending
    .rowOrdering(["Northland Region", 
                  "Auckland Region", 
                  "Waikato Region", 
                  "Bay of Plenty Region", 
                  "Gisborne Region", 
                  "Hawke's Bay Region", 
                  "Taranaki Region",
                  "Manawatu-Wanganui Region",  
                  "Wellington Region", 
                  "Tasman Region",
                  "Nelson Region", 
                  "Marlborough Region", 
                  "West Coast Region",
                  "Canterbury Region",  
                  "Otago Region", 
                  "Southland Region"])
    .transitionDuration(1000)
    .height(600)
    //.title(function(d,i){return i})
    //.label(function(){return ' '})
    .elasticX(true)
    .labelOffsetX(20)

  region_chart.xAxis().tickFormat(function(x) {return d3.format('s')(Math.abs(x))})
  
  dc.renderAll()
//  year_chart.filter(2015)
//  dc.redrawAll()
}
