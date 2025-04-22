// import { NextRequest, NextResponse } from "next/server";
// import dbConnect from "@/lib/connectdb";
// import { User } from "@/models/user";

// export async function POST(req: NextRequest, res: NextResponse) {
//   await dbConnect(); // Ensure MongoDB is connected

//   const { email, name, image, provider } = await req.json();

//   // Validate input
//   if (!email || !name || !provider) {
//     return NextResponse.json(
//         { message: "Missing required fields" },
//         { status: 400 }
//       );
//   }

//   // Check if provider is allowed
//   if (!["google", "email"].includes(provider)) {
//     return NextResponse.json(
//         { message: "Provider not supported" },
//         { status: 403 }
//       );
//   }

//   // Create a new user
//   try {
//     const newUser = new User({
//       email,
//       name,
//       image,
//       provider,
//       status: "active",
//       createdAt: new Date(),
//       updatedAt: new Date(),
//     });

//     await newUser.save();
//     return NextResponse.json(
//         { message: "Signup Successfully", data: newUser },
//         { status: 201 }
//       );
//   } catch (error) {
//     return NextResponse.json(
//         { error: "Provider not supported" },
//         { status: 500 }
//       );
//   }
// }
import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/connectdb";
import { User } from "@/models/user";

export async function POST(req: NextRequest) {
  await dbConnect(); // Ensure MongoDB is connected

  try {
    const { email, name, image, provider } = await req.json();

    // Validate input
    if (!email || !name || !provider) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Check if provider is allowed
    if (!["google", "email"].includes(provider)) {
      return NextResponse.json(
        { error: "Provider not supported" },
        { status: 403 }
      );
    }

    // Create a new user
    const newUser = new User({
      email,
      name,
      image,
      provider,
      status: "active",
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await newUser.save();
    return NextResponse.json(newUser, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}