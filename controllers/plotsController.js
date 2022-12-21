const Plot = require("../models/Plot");
const Block = require("../models/Block");

const asyncHandler = require("express-async-handler");
const enums = require("../enums");

//@desc Get all Plots
//@route GET /plots
//@access private
const getAllPlots = asyncHandler(async (req, res) => {
  const plot = await Plot.find().populate("blockId").populate("customerId");
  if (!plot?.length) {
    return res.status(404).json({ message: "No plot found" });
  }

  // Add username to each note before sending the response
  // See Promise.all with map() here: https://youtu.be/4lqJBBEpjRE
  // You could also do this with a for...of loop
  // const notesWithUser = await Promise.all(
  //   notes.map(async (note) => {
  //     const user = await User.findById(note.user).lean().exec();
  //     return { ...note, username: user.username };
  //   })
  // );

  // res.json(notesWithUser);
  res.status(200).json({ message: "List of found plots", data: plot });
  // res.status(201).json({ messaage: `New Block ${block.name} created` });
});

//@desc Get single Plot
//@route GET /plot/:id
//@access private
const getPlotById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  if (!id) {
    return res.status(404).json({ message: "Please provide plot id" });
  }
  const plot = await Plot.findById(id)
    .populate("blockId")
    .populate("customerId");
  if (!plot) {
    return res.status(404).json({ message: "No plot found" });
  }

  // res.json(notesWithUser);
  res.status(200).json({ message: "Found plot", data: plot });
  // res.status(201).json({ messaage: `New Block ${block.name} created` });
});

//@desc  Create new Plot
//@route POST /plots
//@access private
const createNewPlot = asyncHandler(async (req, res) => {
  const {
    blockId,
    plot_number,
    plot_type,
    area_unit,
    area,
    category,
    is_cornered,
  } = req.body;
  // Validate
  if (
    !blockId ||
    !plot_number ||
    !plot_type ||
    !area ||
    !area_unit ||
    !category
  ) {
    return res.status(400).json({ message: "All fields are required" });
  }

  let allowedUnits = [enums.area_unit.kanal, enums.area_unit.marla];
  let allowedCategory = [enums.category.commercial, enums.category.residential];
  let allowedPlotType = [enums.type.shop, enums.type.house];

  if (allowedUnits.indexOf(area_unit) < 0) {
    res.status(400).json({ message: "Invalid unit for area!" });
  }
  if (allowedCategory.indexOf(category) < 0) {
    res.status(400).json({ message: "Invalid plot category!" });
  }
  if (allowedPlotType.indexOf(plot_type) < 0) {
    res.status(400).json({ message: "Invalid plot type!" });
  }

  // Check for block
  const foundBlock = await Block.findOne({ _id: blockId }).lean().exec();
  if (!foundBlock) {
    return res.status(409).json({ message: "Block not found!" });
  }

  // Check for duplicate title
  const duplicate = await Plot.findOne({ plot_number }).lean().exec();

  if (duplicate) {
    return res.status(409).json({ message: "Duplicate plot number" });
  }

  //Create note object
  const plotObject = {
    blockId,
    plot_number,
    plot_type,
    area,
    area_unit,
    category,
    is_cornered,
  };

  //Create a new Note
  const plot = await Plot.create(plotObject);
  console.log(plot);
  if (plot) {
    res.status(201).json({
      messaage: `New Plot with ${plot.plot_number} created`,
      data: plot,
    });
  } else {
    res.status(400).json({ message: "Invalid plot data received!" });
  }
});

//@desc  Update Plot
//@route Patch /plots
//@access private
const updatePlot = asyncHandler(async (req, res) => {
  const {
    _id,
    blockId,
    plot_number,
    plot_type,
    area_unit,
    area,
    category,
    is_cornered,
  } = req.body;
  //Validate fields
  if (
    (!_id,
    !blockId || !plot_number || !plot_type || !area || !area_unit || !category)
  ) {
    return res.status(400).json({ message: "All fields are required" });
  }

  //Find Plot
  const plot = await Plot.findById(_id).exec();

  if (!plot) {
    return res.status(400).json({ messaage: "No plot found!" });
  }

  let allowedUnits = [enums.area_unit.kanal, enums.area_unit.marla];
  let allowedCategory = [enums.category.commercial, enums.category.residential];
  let allowedPlotType = [enums.type.shop, enums.type.house];

  if (allowedUnits.indexOf(area_unit) < 0) {
    res.status(400).json({ message: "Invalid unit for area!" });
  }
  if (allowedCategory.indexOf(category) < 0) {
    res.status(400).json({ message: "Invalid plot category!" });
  }
  if (allowedPlotType.indexOf(plot_type) < 0) {
    res.status(400).json({ message: "Invalid plot type!" });
  }
  // Check for block
  const foundBlock = await Block.findOne({ _id: blockId }).lean().exec();
  if (!foundBlock) {
    return res.status(409).json({ message: "Block not found!" });
  }

  // Check for duplicate title
  const duplicate = await Plot.findOne({
    $and: [{ plot_number: { $eq: plot_number } }, { _id: { $ne: _id } }],
  })
    .lean()
    .exec();

  console.log("duplicate", duplicate);
  if (duplicate) {
    return res.status(409).json({ message: "Duplicate plot number" });
  }
  // Allow renaming of the original name
  if (duplicate && duplicate?._id.toString() !== _id) {
    return res.status(409).json({ message: "Duplicate block name" });
  }

  plot.plot_number = plot_number;
  plot.plot_type = plot_type;
  plot.area_unit = area_unit;
  plot.area = area;
  plot.category = category;
  plot.is_cornered = is_cornered;

  const updatedPlot = await plot.save();
  res.json({
    message: `${updatedPlot.plot_number} updated!`,
    data: updatedPlot,
  });
});

//@desc Delete a Plot
//@route DELETE /plots
//@access private
const deletePlot = asyncHandler(async (req, res) => {
  const { _id } = req.body;
  //Validate fields
  if (!_id) {
    return res.status(400).json({ message: "Plot ID Required" });
  }
  //Find Note
  const plot = await Plot.findById(_id).exec();
  if (!plot) {
    return res.status(400).json({ message: "Plot not found!" });
  }
  //Delete Note
  const result = await plot.deleteOne();
  const reply = `Block ${result.plot_number} deleted`;
  res.json({ message: reply });
});

module.exports = {
  getAllPlots,
  getPlotById,
  createNewPlot,
  updatePlot,
  deletePlot,
};
