// default map projection

projection = d3.geo.mercator()
            .center([170,-42])
            .scale(1600)
            .translate([220, 320]); // width, height

//-----------------Colours-------------------------------

// we provide a colour map for all of our charts to use. (Blair likes the default, although it needs its greys sorted as they tend to the invisible) There's a useful colour map generator at  http://tools.medialab.sciences-po.fr/iwanthue/, althought it does tend toward the 70's if your're not careful.

// Government accessability standards also require adequate leb=vels of contrast between text and background, which when the background is white/grey OR a coloured bar necessitates the use of relatively pale or unsaturated colors.    

var our_colors =

["#EAC337",
"#DC63BD",
"#E85057",
"#D08735",
"#E55F2A",
"#DF5784",
"#D27EA9",
"#AE9936",
"#D3715C"]

var default_colors = d3.scale.ordinal().range(our_colors) 

// Choropleths and other maps require a colourscale. Because of the way choropleth .colorAccessor and .colourCalculator work with missing data, we need to also specify a colour for zero/missing, and a colourscale. map_zero_colour sholud be a little lighter (or whatever means "smaller" onyout chart) than the bottom value in the colourscale.

var map_zero_colour = "#f0eaca"
var colourscale = d3.scale.linear().range(["#ebdfa4","#907808"]) // grass green(for the maps)
 
// -------------Date Formats-----------------------------

var dateFormat = d3.time.format('%d/%m/%Y')
var display_dateFormat = d3.time.format('%Y-%m-%d')
//

function dim_zero_rows(chart) {
  chart.selectAll('text.row').classed('hidden',function(d){return (d.value < 0.1)});
}

function cleanChartData(precision, orderedBy) {
  return function(data){
    results = _.map(data.all(), function(a) {return {key:a.key,value:Math.abs(Math.round(a.value/precision))*precision}});
    if (orderedBy) {
      results = _.sortBy(results, orderedBy)
    }
    return results
  }
}


//-------------------axis and title formats ---------------------
var format_s = d3.format('s') //SI prefix
var format_d = d3.format('d') //integer

var integer_format = function(d){if (d==0) {return format_d(d)} 
                                 else if(d < 1){return ""} //because you can't have fractional consents
                                 else {return format_s(d)} //SI prefix 
                                } 

var title_integer_format =d3.format(',') 

var format_highdollar = d3.format('$0.3s') //values over $100
var format_highdollar_axis = d3.format('$s')
var format_10dollar   = d3.format('$0.2s') //values between $10 and $100
var format_lowdollar = d3.format('$0.2f')  // values less than $10

var axis_dollar_format = function(d){if (d != 0 && d <1) {return format_lowdollar(d)} 
                                     else { return format_highdollar_axis(d)}}

var title_dollar_format = function(d){if(d < 10){return format_lowdollar(d)} 
                                      else if (d < 100 ) {return format_10dollar(d)} 
                                      else {return format_highdollar(d)}}

var percent_format = d3.format('%')
var float_format = function(value) {return value ? d3.format('0.2f')(value):"0.00"};

//------------------------------ Data Cleanup functions ---------------------------------
//-----------------------------------titleCase-------------------------------------
// ------ TitleCasing strings can fix a multitude of filthy data sins -------------- 

titleCache={} //memorises results, otherwise this can be really slow.

function titleCase(str){//converts to Title Case. Corrects some cases of inconsistent input. 

 lower = str.toLocaleLowerCase();
  if (titleCache[lower]) return titleCache[lower];
 var i, j, lowers, uppers;
  str = str.replace(/([^\W_]+[^\s-]*) */g, function(txt) {
    return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();
  });

  // Certain minor words should be left lowercase unless 
  // they are the first or last words in the string
  lowers = ['A', 'An', 'Acting As', 'The', 'And', 'But', 'Or', 'For', 'Nor', 'As', 'At', 
  'By', 'For', 'From', 'In', 'Into', 'Near', 'Of', 'On', 'Onto', 'To', 'With'];
  for (i = 0, j = lowers.length; i < j; i++)
    str = str.replace(new RegExp('\\s' + lowers[i] + '\\s', 'g'), 
      function(txt) {
        return txt.toLowerCase();
      });

  // Certain words such as initialisms or acronyms should be left uppercase
  uppers = ['Id', 'Tv', 'Rc', 'Rma', '37a', 'Linz'];
  for (i = 0, j = uppers.length; i < j; i++)
    str = str.replace(new RegExp('\\b' + uppers[i] + '\\b', 'g'), 
      uppers[i].toUpperCase());
  titleCache[lower] = str;
  return str;
}

// Government departments are fond of a certain variety of typological correctness, which includes using Microsoft's longdash. Let's just not.

function remove_longdash(d){return d.replace(",àí","-")}

//trimAll removes newlines, extra whitespace, stupid characters from everything. You can put project-specific stupid characters here too, as another .replace{stupid_string, good_string}

function trimAll(d) {
  for (i in d) {
    var value = d[i];
    if (value.trim) {
    value = value.trim()
      .replace(/Matamata.*Piako/, "Matamata-Piako")
      .replace('Rotorua Lakes','Rotorua')
      .replace("Hawkes","Hawke's")
      .replace(/\s{2,}/," ")
      .replace("‚àí","-")
      .replace("−","-")
      .replace("≈´","u");
    }
    
    delete d[i]
    i = i.trim().split('\n')[0];
    d[i] = value;
  }
}

//-----------------------here endith the cleanup functions-------------------------

//A bit of D3 goodness. Apply title text and legend text from file. Also, if title exists, append an i-circle.

function apply_text(_title_text) {
  for (i in _title_text){
        selection = d3.select("#"+_title_text[i].id)
        selection.select("legend").attr("title", _title_text[i].hover_text)
                                  .append("span").text(_title_text[i].legend_title + " ")
        if(_title_text[i].hover_text != ""){
           selection.select("legend").append("i").attr("class","fa fa-info-circle")
        }
  }  
}


// Make some tabs. Tabs are classed "selected" if selected, "hasFilter" if containing an active filter.


  function make_tabs(tabs){
      tab = d3.select("#tabs").selectAll("div").data(tabs).enter().append("div").attr("class","col-sm-2 tab");
      tab_reset = d3.select("#tabs")
                    .select("span.pull-right")
                    .selectAll(".reset").data(tabs).enter().append("a").attr("class","fa fa-refresh")
                                      .attr('title',function(d){ return "reset " + d.label })
                                      .classed('reset', true)
                                      .classed('hidden', true)
                                      .on('click',function(d) {
                                        d.resetFunction()
                                        d3.select(this).classed("hidden", true);
                                      });
                                   
      tab.text(function(d){return d.label});
      tab.on("click",function(d) {
        // content panel!
        d3.selectAll(".tab-pane").classed("active", false);
        d3.select('#'+d.content).classed("active", true);
        
        // tabs!
        d3.select("#tabs").selectAll("div").classed("selected", false);
        d3.select(this).classed("selected", true);
        
        //resets! (hide resets)
        thisTab = d.content
        d3.selectAll('#tabs').selectAll('.reset')
          .classed('hidden', function(d) {return d.content != thisTab || !d.chart.hasFilter()})
        
        hidden = d3.select(this).data()[0].type != "choropleth" || (projection.scale() == 1600 && JSON.stringify(projection.translate()) == JSON.stringify([220,320]))
        console.log(d3.select(this).data()[0].type)
        d3.select('#resetPosition').classed('hidden', function(){return hidden})
      });
    d3.select("#tabs").select("div").classed("selected",true) // first one selected
  }

//-----Hide reset position on Choropleth tabs if not repositioned or not in a Choropleth 

function hideReset(force) {
  d3.select('#resetPosition').classed('hidden',function(){return force || projection.scale() == 1600 && JSON.stringify(projection.translate()) == JSON.stringify([220,320])});
} 

//-----------------------------------marginize--------------------------

//fixes problem where charts overflow their divs. Should not be needed unlesschartwidths have previously been monkeyed with. Try not to monkey with chart widths in general. 

function marginize() {
  charts  = dc.chartRegistry.list();
  for (i in charts) {
    var chart = charts[i];
    if (chart.margins) {
      width = chart.width() - 30;
      chart.width(width);
    }
  }
}

//--------------------------- Complete group ---------------------------

// Sometimes you'll want all possible options to appear in a chart, regardless of whether they appear in the dataset or not.  

function generateCompleteGroup(group, mustHaveKeys, replacementValue) {
  var rv = replacementValue || 0;
  function f() {
    var data  = group.all();
    alreadyHasKey = data.map(_.property("key"))
    for (i in mustHaveKeys) {
      key = mustHaveKeys[i];
      if (!_.contains(alreadyHasKey,key)) {
        data.push({key:key,value:rv});
      }
    }
    return _.sortBy(data, function(d){return d.key});
  }
  return {
    all:f,top:f
  }
}
  
grey_undefined = function(chart) {
  chart.selectAll("text.row").classed("grey",function(d) {return d.value.not_real || d.value.count == 0})
}

grey_zero = function(chart) {
  chart.selectAll("text.row").classed("grey",function(d) {return d.value == 0})
}

//-----------------------------save stuff ------------------

save = function(save_data, type, filename){
    if(!save_data) {
        console.error('Console.save: No data')
        return;
    }
    
    if(!type) type = 'json'
  
    if(!filename) filename = 'console.'+type

    if(typeof save_data === "object"){
      if (type == 'csv'){save_data = d3.csv.format(save_data)}
      if (type == 'json'){save_data = JSON.stringify(save_data, undefined, 4)}
    }

    var blob = new Blob([save_data], {type: 'text/'+type}),
        e    = document.createEvent('MouseEvents'),
        a    = document.createElement('a')

    a.download = filename
    a.href = window.URL.createObjectURL(blob)
    a.dataset.downloadurl =  ['text/csv', a.download, a.href].join(':')
    e.initMouseEvent('click', true, false, window, 0, 0, 0, 0, 0, false, false, false, false, 0, null)
    a.dispatchEvent(e)
}

//---------------------- download current records ----------------------

download = function(){save(these_records(), "csv", "filtered_consents.csv") }

