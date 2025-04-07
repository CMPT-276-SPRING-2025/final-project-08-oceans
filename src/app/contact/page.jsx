'use client'

import React from 'react'

const ContactPage = () => {

/** Handles form submission using Web3Forms API */

  const [result, setResult] = React.useState("");

  const onSubmit = async (event) => {
    event.preventDefault();
    setResult("Sending....");
    const formData = new FormData(event.target);

    formData.append("access_key", "");

    const response = await fetch("https://api.web3forms.com/submit", {
      method: "POST",
      body: formData
    });

    const data = await response.json();

    if (data.success) {
      setResult("Form Submitted Successfully");
      event.target.reset();
    } else {
      console.log("Error", data);
      setResult(data.message);
    }
  };
  
  return (
    <div className="flex flex-col justify-center items-center 3xl:pt-[280px] lg:pt-[130px] pb-20 min-h-screen">
      {/* Centered Form Container */}
      <div className="w-full max-w-md sm:max-w-lg md:max-w-xl bg-[#FDE7CB] p-6 md:p-8 rounded-2xl hover:shadow-xl transition duration-400">
        <h2 className="text-center text-2xl md:text-3xl font-semibold mb-5">Send Us a Message!</h2>

        <form className="space-y-2" onSubmit={onSubmit}>
          {/* First Name & Last Name - Responsive Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:gap-14">
            <div>
              <label className="block text-md font-medium text-gray-800 py-2">First Name</label>
              <input 
                type="text" placeholder='Enter first name' required name='firstname'
                className="w-full p-3 bg-orange-50 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-orange-400
                placeholder-gray-400"/>
            </div>

            <div>
              <label className="block text-md font-medium text-gray-800 py-2">Last Name</label>
              <input 
                type="text" placeholder='Enter last name' required name='lastname'
                className="w-full p-3 border border-gray-300 bg-orange-50 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-400
                placeholder-gray-400"
              />
            </div>
          </div>

          {/* Email Field */}
          <div>
            <label className="block text-md font-medium text-gray-800 py-2">Email</label>
            <input 
              type="email" placeholder='Enter your email' required name='email'
              className="w-full p-3 border border-gray-300 bg-orange-50 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-400
              placeholder-gray-400"
            />
          </div>

          {/* Message Field */}
          <div>
            <label className="block text-md font-medium text-gray-800 py-2">Message</label>
            <textarea placeholder='Enter your message' required name='message'
              className="w-full p-3 border border-gray-300 bg-orange-50 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-400 h-32 resize-none
              placeholder-gray-400"
            />
          </div>

          {/* Submit Button */}
          <div className="flex justify-center pt-4">
            <button 
              type="submit" 
              className="bg-orange-500 text-white font-semibold py-3 px-6 rounded-full shadow-md hover:bg-orange-600 transition w-4/12 "
            >
              Submit
            </button>
          </div>

          {/* Submission Result Message */}
          <p className='text-center text-md font-medium text-gray-700 pt-4'>{result}</p>
        </form>
      </div>
    </div>
  )
}

export default ContactPage
