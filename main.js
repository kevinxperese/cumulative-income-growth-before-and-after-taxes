const svg = d3.select("svg"),
      margin = {top: 10, right: 125, bottom: 20, left: 30},
      width = svg.attr("width") - margin.left - margin.right,
      height = svg.attr("height") - margin.top - margin.bottom,
      g = svg.append("g").attr("transform", "translate("+margin.left+","+margin.top+")")

const x = d3.scaleLinear().domain([1979,2014]).range([0,width]),
      y = d3.scaleLinear().domain([125,-25]).range([0,height]),
      colorsBefore = d3.scaleOrdinal().domain(["bottom", "middle", "top"]).range(["#9DC69D", "#82A882", "#4F844F"]),
      colorsAfter = d3.scaleOrdinal().domain(["bottom", "middle", "top"]).range(["#BA749B", "#A54E7E", "#7F2969"]),
      properLabels = d3.scaleOrdinal().domain(["bottom", "middle", "top"]).range(["Bottom Quartile", "Middle Quartiles", "Top Quartile"])

const line = d3.line()
              .x(function(d) { return x(d.year); })
              .y(function(d) { return y(d.value); });

let currentData
let colors = colorsBefore

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

  //zero line
  g.append("line").attr("x1", x.range()[0]).attr("x2", x.range()[1]).attr("y1", y(0)).attr("y2", y(0)).style("stroke", "#444")

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

  currentData = dataBefore

  let quartiles = g.selectAll(".quartile")
    .data(currentData)
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
      .attr("x", d => x(2014) + 10)
      .attr("y", function (d) {
        let finalYearInSeries = d.values.filter(z => z.year===2014)[0]
        return y(finalYearInSeries.value)
      })
      .style("fill", d => colors(d.id))
      .attr("class", "label")

  let dataLabel = g.append("circle").attr("r", 5).style("opacity", 0)
  let dataLabelTextBG = g.append("text").attr("id", "dataLabelTextBG").style("opacity", 0)
  let dataLabelText = g.append("text").attr("id", "dataLabelText").style("opacity", 0)

  //mouseover behavior
  svg
    .on("mousemove", function (d) {

      let xPos = d3.mouse(this)[0]
      let yPos = d3.mouse(this)[1]

      //don't do mouseover unless mouse is within margins of the chart
      if(xPos < margin.left || xPos > width + margin.left)
        return

      //convert the mouseX to a year, find the data for that year from each series
      let year = Math.round(x.invert(xPos-margin.left))
      let seriesValuesAtSelectedDate = currentData.map( function (series) {
        return {
          id: series.id,
          value: series.values.filter(z => z.year===year)[0].value
        }
      })

      //find the series closest to the mouse
      let mouseYValue = y.invert(yPos-margin.top)
      let closenessToMouse = 1e6
      let closestToMouse
      seriesValuesAtSelectedDate.forEach(function (z) {

        let thisDistanceToMouse = Math.abs(mouseYValue - z.value)

        if(thisDistanceToMouse < closenessToMouse){
          closenessToMouse = thisDistanceToMouse
          closestToMouse = z
        }
      })

      dataLabel
        .attr("cx", x(year))
        .attr("cy", y(closestToMouse.value))
        .style("fill", colors(closestToMouse.id))
        .style("opacity", 1)

      dataLabelText
        .text(closestToMouse.value)
        .attr("x", x(year))
        .attr("y", y(closestToMouse.value)-10)
        .style("fill", colors(closestToMouse.id))
        .style("opacity", 1)

      dataLabelTextBG
        .text(closestToMouse.value)
        .attr("x", x(year))
        .attr("y", y(closestToMouse.value)-10)
        .style("fill", colors(closestToMouse.id))
        .style("opacity", 1)
    })
    .on("mouseout", function () {
      dataLabel
        .style("opacity", 0)
      dataLabelText
        .style("opacity", 0)
      dataLabelTextBG
        .style("opacity", 0)
    })

  g.append("g")
    .attr("class", "axis axis--x")
    .attr("transform", "translate(0," + height + ")")
    .call(d3.axisBottom(x).tickFormat(d3.format("")))

  g.append("g")
    .attr("class", "axis axis--y")
    .attr("transform", "translate(0,0)")
    .call(d3.axisLeft(y).tickSize(-6).tickPadding(6).tickValues([-25,0,25,50,75,100,125]))

  d3.selectAll("#controls input[name=mode]").on("change", function() {

    currentData = this.value==="After" ? dataAfter : dataBefore
    colors = this.value==="After" ? colorsAfter : colorsBefore

    let updateSelection = g.selectAll(".quartile")
          .data(currentData)

    updateSelection
      .select("path")
        .transition()
        .attr("d", d => line(d.values))
        .style("stroke", d => colors(d.id))

    updateSelection
      .select("text")
        .transition()
        .attr("y", function (d) {
          let finalYearInSeries = d.values.filter(z => z.year===2014)[0]
          return y(finalYearInSeries.value)
        })
        .style("fill", d => colors(d.id))
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
