const svg = d3.select("svg"),
      margin = {top: 10, right: 125, bottom: 20, left: 35},
      width = svg.attr("width") - margin.left - margin.right,
      height = svg.attr("height") - margin.top - margin.bottom,
      g = svg.append("g").attr("transform", "translate("+margin.left+","+margin.top+")")

const x = d3.scaleLinear().domain([1979,2014]).range([0,width]),
      y = d3.scaleLinear().domain([125,-25]).range([0,height]),
      colors = d3.scaleOrdinal().domain(["bottom", "middle", "top"]).range(["#59AAB2", "#2E8593", "#06576D"]),
      properLabels = d3.scaleOrdinal().domain(["bottom", "middle", "top"]).range(["Bottom Quartile", "Middle Quartiles", "Top Quartile"])

const line = d3.line()
              .x(function(d) { return x(d.year); })
              .y(function(d) { return y(d.value); });

d3.queue()
    .defer(d3.csv, "before-data.csv", type)
    .defer(d3.csv, "after-data.csv", type)
    .defer(d3.csv, "recession-data.csv", typeRecession)
    .await(ready);

function ready(error, before, after, recession) {
  if (error) throw error

  let recessionBars = g.selectAll(".recession")
    .data(recession)
      .enter()
      .append("rect")
        .attr("x", d => x(d.start))
        .attr("y", 0)
        .attr("width", d => x(d.end) - x(d.start))
        .attr("height", height)
        .attr("class", "recession")

  //transform the before tax data for charting. three lines means array with three rows
  let dataBefore = before.columns.slice(1).map( function (id) {
    return {
      id: id,
      values: before.map( function (d){
        return {year: d.year, value: d[id]}
      })
    }
  })

  //transform after tax data
  let dataAfter = after.columns.slice(1).map( function (id) {
    return {
      id: id,
      values: after.map( function (d){
        return {year: d.year, value: d[id]}
      })
    }
  })

  let quartiles = g.selectAll(".quartile")
    .data(dataBefore)
    .enter().append("g")
      .attr("class", "quartile")

  quartiles
    .append("path")
      .attr("class", "line")
      .attr("d", d => line(d.values))
      .style("stroke", d => colors(d.id))

  quartiles
    .append("text")
      .text(d => properLabels(d.id))
      .attr("x", d => x(2014) + 5)
      .attr("y", function (d) {
        let finalYearInSeries = d.values.filter(z => z.year===2014)[0]
        return y(finalYearInSeries.value)
      })
      .style("fill", d => colors(d.id))
      .attr("class", "label")

  g.append("g")
    .attr("class", "axis axis--x")
    .attr("transform", "translate(0," + height + ")")
    .call(d3.axisBottom(x).tickFormat(d3.format("")))

  g.append("g")
    .attr("class", "axis axis--y")
    .attr("transform", "translate(0,0)")
    .call(d3.axisLeft(y).tickValues([-25,0,25,50,75,100,125]))

  d3.selectAll("#controls input[name=mode]").on("change", function() {

    let data = this.value==="After" ? dataAfter : dataBefore

    let updateSelection = g.selectAll(".quartile")
          .data(data)

    updateSelection
      .select("path")
        .transition()
        .attr("d", d => line(d.values))

    updateSelection
      .select("text")
        .transition()
        .attr("y", function (d) {
          let finalYearInSeries = d.values.filter(z => z.year===2014)[0]
          return y(finalYearInSeries.value)
        })
  })
}

function type (d) {
  d.year = +d.year
  d.bottom = +d.bottom
  d.top = +d.top
  d.middle = +d.middle

  return d
}

function typeRecession (d) {
  d.start = +d.start
  d.end = +d.end

  return d
}
